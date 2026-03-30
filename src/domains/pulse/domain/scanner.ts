import type {
  RawMessage,
  SessionSummary,
  ProjectSummary,
  DailyActivity,
  HourlyActivity,
  DashboardData,
  ToolCallSummary,
} from './model';

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as { type: string; text?: string }[])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n');
  }
  return '';
}

function truncate(s: string, maxLen = 200): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '\u2026';
}

/** Decode a dash-encoded project directory name to a human-readable project name. */
export function decodeProjectPath(encoded: string): string {
  const parts = encoded.split('-').filter(Boolean);
  return parts[parts.length - 1] ?? encoded;
}

/** Parse JSONL content into an array of raw messages, skipping malformed lines. */
export function parseJSONLContent(content: string): RawMessage[] {
  const lines = content.split('\n').filter((l) => l.trim());
  const messages: RawMessage[] = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as RawMessage);
    } catch {
      // skip malformed lines
    }
  }
  return messages;
}

/** Build a session summary from parsed messages. Returns null if the session has no meaningful data. */
export function buildSessionSummary(
  sessionId: string,
  projectPath: string,
  messages: readonly RawMessage[],
  subagentCount = 0
): SessionSummary | null {
  if (messages.length === 0) return null;

  const userMessages = messages.filter(
    (m) => m.type === 'user' || (m.type === 'message' && m.role === 'user')
  );
  const assistantMessages = messages.filter(
    (m) => m.type === 'assistant' || (m.type === 'message' && m.role === 'assistant')
  );

  if (userMessages.length === 0 && assistantMessages.length === 0) return null;

  const timestamps = messages
    .map((m) => new Date(m.timestamp).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) return null;

  const startTime = new Date(timestamps[0]).toISOString();
  const endTime = new Date(timestamps[timestamps.length - 1]).toISOString();
  const durationMs = timestamps[timestamps.length - 1] - timestamps[0];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreateTokens = 0;
  let model = 'unknown';

  const toolCallMap = new Map<string, number>();

  for (const msg of assistantMessages) {
    const apiMsg = msg.message;
    if (apiMsg?.usage) {
      totalInputTokens += apiMsg.usage.input_tokens ?? 0;
      totalOutputTokens += apiMsg.usage.output_tokens ?? 0;
      totalCacheReadTokens += apiMsg.usage.cache_read_input_tokens ?? 0;
      totalCacheCreateTokens += apiMsg.usage.cache_creation_input_tokens ?? 0;
    }
    if (apiMsg?.model) model = apiMsg.model;
    if (apiMsg?.content) {
      for (const block of apiMsg.content) {
        if (block.type === 'tool_use') {
          const name = 'name' in block ? block.name : 'unknown';
          toolCallMap.set(name, (toolCallMap.get(name) ?? 0) + 1);
        }
      }
    }
  }

  const firstUserMsg = userMessages[0];
  const lastUserMsg = userMessages[userMessages.length - 1];
  const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];

  const firstUserPrompt = truncate(
    extractText(firstUserMsg?.message?.content ?? firstUserMsg?.content ?? '')
  );
  const lastUserPrompt = truncate(
    extractText(lastUserMsg?.message?.content ?? lastUserMsg?.content ?? '')
  );
  const lastAssistantResponse = truncate(
    extractText(lastAssistantMsg?.message?.content ?? lastAssistantMsg?.content ?? '')
  );

  const toolCalls: ToolCallSummary[] = Array.from(toolCallMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const projectName = decodeProjectPath(
    projectPath.replace(/\/$/, '').split('/').pop() ?? projectPath
  );

  // Extract the real workspace cwd from the first message that has one
  const workspacePath = messages.find((m) => m.cwd)?.cwd ?? projectPath;

  return {
    id: sessionId,
    projectPath,
    projectName,
    workspacePath,
    startTime,
    endTime,
    durationMs,
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreateTokens,
    model,
    gitBranch: messages.find((m) => m.gitBranch)?.gitBranch,
    firstUserPrompt,
    lastUserPrompt,
    lastAssistantResponse,
    toolCalls,
    subagentCount,
  };
}

/** Compute the total token count for a session. */
export function sessionTotalTokens(s: SessionSummary): number {
  return (
    s.totalInputTokens + s.totalOutputTokens + s.totalCacheReadTokens + s.totalCacheCreateTokens
  );
}

/** Aggregate all sessions into a full DashboardData snapshot. */
export function aggregateDashboard(sessions: readonly SessionSummary[]): DashboardData {
  const projectMap = new Map<
    string,
    {
      path: string;
      name: string;
      sessionCount: number;
      totalTokens: number;
      totalMessages: number;
      lastActiveTime: string;
      sessions: SessionSummary[];
    }
  >();

  const dailyMap = new Map<string, DailyActivity>();
  const hourlyMap = new Map<string, HourlyActivity>();
  let totalTokens = 0;
  let totalMessages = 0;
  let firstSessionDate = '';
  const modelUsage: Record<string, { inputTokens: number; outputTokens: number }> = {};

  for (const summary of sessions) {
    const tokens = sessionTotalTokens(summary);

    // Project aggregation
    let project = projectMap.get(summary.projectPath);
    if (!project) {
      project = {
        path: summary.projectPath,
        name: summary.projectName,
        sessionCount: 0,
        totalTokens: 0,
        totalMessages: 0,
        lastActiveTime: '',
        sessions: [],
      };
      projectMap.set(summary.projectPath, project);
    }
    project.sessions.push(summary);
    project.sessionCount++;
    project.totalTokens += tokens;
    project.totalMessages += summary.messageCount;
    if (!project.lastActiveTime || summary.endTime > project.lastActiveTime) {
      project.lastActiveTime = summary.endTime;
    }

    // Daily aggregation
    const date = summary.startTime.slice(0, 10);
    const startDate = new Date(summary.startTime);
    const hour = startDate.getHours();
    const dayOfWeek = startDate.getDay();

    const daily = dailyMap.get(date) ?? {
      date,
      messageCount: 0,
      sessionCount: 0,
      toolCallCount: 0,
      tokensByModel: {},
    };
    daily.messageCount += summary.messageCount;
    daily.sessionCount++;
    daily.toolCallCount += summary.toolCalls.reduce((s, t) => s + t.count, 0);
    daily.tokensByModel[summary.model] = (daily.tokensByModel[summary.model] ?? 0) + tokens;
    dailyMap.set(date, daily);

    // Hourly aggregation
    const hourKey = `${dayOfWeek}-${hour}`;
    const hourly = hourlyMap.get(hourKey) ?? {
      hour,
      dayOfWeek,
      messageCount: 0,
      tokenCount: 0,
    };
    hourly.messageCount += summary.messageCount;
    hourly.tokenCount += tokens;
    hourlyMap.set(hourKey, hourly);

    // Global stats
    totalTokens += tokens;
    totalMessages += summary.messageCount;
    if (!firstSessionDate || summary.startTime < firstSessionDate) {
      firstSessionDate = summary.startTime;
    }
    if (!modelUsage[summary.model]) {
      modelUsage[summary.model] = { inputTokens: 0, outputTokens: 0 };
    }
    modelUsage[summary.model].inputTokens += summary.totalInputTokens;
    modelUsage[summary.model].outputTokens += summary.totalOutputTokens;
  }

  // Freeze mutable accumulators into immutable ProjectSummary objects.
  const projects: ProjectSummary[] = Array.from(projectMap.values())
    .map((p) => ({
      path: p.path,
      name: p.name,
      sessionCount: p.sessionCount,
      totalTokens: p.totalTokens,
      totalMessages: p.totalMessages,
      lastActiveTime: p.lastActiveTime,
      sessions: [...p.sessions] as readonly SessionSummary[],
    }))
    .sort((a, b) => b.lastActiveTime.localeCompare(a.lastActiveTime));

  const sortedSessions = [...sessions].sort((a, b) => b.startTime.localeCompare(a.startTime));

  return {
    projects,
    sessions: sortedSessions,
    dailyActivity: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    hourlyActivity: Array.from(hourlyMap.values()),
    totalStats: {
      sessions: sessions.length,
      messages: totalMessages,
      tokens: totalTokens,
      projects: projectMap.size,
      firstSessionDate,
      models: modelUsage,
    },
  };
}
