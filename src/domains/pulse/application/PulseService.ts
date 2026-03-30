import * as path from 'node:path';
import type { PulseFileReader } from './ports';
import type { DashboardData, SessionSummary, TimelineResponse } from '../domain/model';
import { parseJSONLContent, buildSessionSummary, aggregateDashboard } from '../domain/scanner';
import {
  buildTimelineResponse,
  buildSubagentTimelineResponse,
  extractFirstPrompt,
} from '../domain/timelineBuilder';

/** Optional logger accepted by PulseService (keeps domain decoupled from vscode). */
export interface PulseLogger {
  appendLine(text: string): void;
}

const noopLogger: PulseLogger = {
  appendLine: () => {
    // intentionally empty — no-op logger
  },
};

export class PulseService {
  private cachedSessions: SessionSummary[] = [];
  private readonly log: PulseLogger;

  constructor(
    private readonly fileReader: PulseFileReader,
    logger?: PulseLogger
  ) {
    this.log = logger ?? noopLogger;
  }

  /** Scan all projects and sessions, returning a full DashboardData snapshot. */
  async scanAll(): Promise<DashboardData> {
    const sessions: SessionSummary[] = [];

    let projectDirs: readonly string[];
    try {
      projectDirs = await this.fileReader.readProjectDirs();
    } catch (err: unknown) {
      this.log.appendLine(
        `[Akashi][Pulse] Failed to read project dirs: ${err instanceof Error ? err.message : String(err)}`
      );
      this.cachedSessions = [];
      return aggregateDashboard([]);
    }

    for (const projectDir of projectDirs) {
      let sessionFiles: readonly string[];
      try {
        sessionFiles = await this.fileReader.readSessionFiles(projectDir);
      } catch (err: unknown) {
        this.log.appendLine(
          `[Akashi][Pulse] Failed to read sessions in ${projectDir}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }

      for (const sessionFile of sessionFiles) {
        const summary = await this.parseSingleFile(sessionFile, projectDir);
        if (summary) {
          sessions.push(summary);
        }
      }
    }

    this.cachedSessions = sessions;
    return aggregateDashboard(sessions);
  }

  /** Scan a single session file, returning its summary or null. */
  async scanSingleSession(filePath: string): Promise<SessionSummary | null> {
    const projectDir = path.dirname(filePath);
    return this.parseSingleFile(filePath, projectDir);
  }

  /** Update a single session in the cache and return the new dashboard. */
  async updateSingleSession(filePath: string): Promise<DashboardData> {
    const updated = await this.scanSingleSession(filePath);
    if (!updated) return aggregateDashboard(this.cachedSessions);

    const idx = this.cachedSessions.findIndex((s) => s.id === updated.id);
    if (idx >= 0) {
      this.cachedSessions = [
        ...this.cachedSessions.slice(0, idx),
        updated,
        ...this.cachedSessions.slice(idx + 1),
      ];
    } else {
      this.cachedSessions = [...this.cachedSessions, updated];
    }

    return aggregateDashboard(this.cachedSessions);
  }

  /** Delete one or more sessions from disk and remove them from the cache. */
  async deleteSessions(sessionIds: readonly string[]): Promise<DashboardData> {
    const idSet = new Set(sessionIds);
    const toDelete = this.cachedSessions.filter((s) => idSet.has(s.id));

    for (const session of toDelete) {
      try {
        await this.fileReader.deleteSessionFile(session.projectPath, session.id);
        this.log.appendLine(`[Akashi][Pulse] Deleted session ${session.id}`);
      } catch (err: unknown) {
        this.log.appendLine(
          `[Akashi][Pulse] Failed to delete session ${session.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    this.cachedSessions = this.cachedSessions.filter((s) => !idSet.has(s.id));
    return aggregateDashboard(this.cachedSessions);
  }

  /** Build the full conversation timeline for a session, including subagent blocks. */
  async getSessionTimeline(sessionId: string): Promise<TimelineResponse | null> {
    const session = this.cachedSessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const filePath = path.join(session.projectPath, `${sessionId}.jsonl`);
    let content: string;
    try {
      content = await this.fileReader.readFileContent(filePath);
    } catch (err: unknown) {
      this.log.appendLine(
        `[Akashi][Pulse] Failed to read timeline for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }

    const rawMessages = parseJSONLContent(content);

    // Load subagent entries
    const subagentEntries = await this.loadSubagentEntries(session.projectPath, sessionId);

    return buildTimelineResponse(sessionId, rawMessages, subagentEntries);
  }

  /** Build the conversation timeline for a specific subagent. */
  async getSubagentTimeline(sessionId: string, agentId: string): Promise<TimelineResponse | null> {
    const session = this.cachedSessions.find((s) => s.id === sessionId);
    if (!session) return null;

    let entries: readonly { agentId: string; content: string; metaContent?: string }[];
    try {
      entries = await this.fileReader.readSubagentEntries(session.projectPath, sessionId);
    } catch {
      return null;
    }

    const entry = entries.find((e) => e.agentId === agentId);
    if (!entry) return null;

    const rawMessages = parseJSONLContent(entry.content);
    return buildSubagentTimelineResponse(sessionId, rawMessages);
  }

  private async loadSubagentEntries(
    projectDir: string,
    sessionId: string
  ): Promise<
    {
      agentId: string;
      agentType: string;
      messageCount: number;
      firstTimestamp?: string;
      firstPrompt?: string;
    }[]
  > {
    let entries: readonly { agentId: string; content: string; metaContent?: string }[];
    try {
      entries = await this.fileReader.readSubagentEntries(projectDir, sessionId);
    } catch {
      return [];
    }

    return entries.map((entry) => {
      let agentType = 'general-purpose';
      if (entry.metaContent) {
        try {
          const meta = JSON.parse(entry.metaContent) as { agentType?: string };
          agentType = meta.agentType ?? agentType;
        } catch {
          // malformed meta — use default
        }
      }

      const messages = parseJSONLContent(entry.content);
      const firstMsg = messages[0];

      return {
        agentId: entry.agentId,
        agentType,
        messageCount: messages.length,
        firstTimestamp: firstMsg?.timestamp,
        firstPrompt: extractFirstPrompt(messages).slice(0, 300),
      };
    });
  }

  private async parseSingleFile(
    filePath: string,
    projectDir: string
  ): Promise<SessionSummary | null> {
    const sessionId = path.basename(filePath, '.jsonl');
    let content: string;
    try {
      content = await this.fileReader.readFileContent(filePath);
    } catch (err: unknown) {
      this.log.appendLine(
        `[Akashi][Pulse] Failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }

    const messages = parseJSONLContent(content);
    let subagentCount = 0;
    try {
      subagentCount = await this.fileReader.countSubagentFiles(projectDir, sessionId);
    } catch {
      // subagent directory missing is expected — not logged
    }

    return buildSessionSummary(sessionId, projectDir, messages, subagentCount);
  }
}
