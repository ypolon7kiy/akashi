import type { RawMessage, TimelineBlock, SubagentInfo, TimelineResponse } from './model';

const RESULT_MAX = 2000;

function truncateResult(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n... (truncated)' : s;
}

function extractBlockText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as { type: string; text?: string }[])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n');
  }
  return '';
}

const SKIP_TYPES = new Set(['file-history-snapshot', 'queue-operation', 'progress']);

/** Build a flat list of TimelineBlocks from raw JSONL messages. */
export function buildTimelineBlocks(raw: readonly RawMessage[]): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const msg of raw) {
    const ts = msg.timestamp ?? '';
    const id = msg.uuid ?? '';

    if (SKIP_TYPES.has(msg.type)) continue;

    // ── System blocks ──
    if (msg.type === 'system') {
      blocks.push({
        id,
        timestamp: ts,
        type: 'system',
        systemSubtype: msg.subtype ?? '',
        text: typeof msg.content === 'string' ? msg.content.slice(0, 500) : '',
      });
      continue;
    }

    // ── User blocks (may contain tool_result + text) ──
    if (msg.type === 'user') {
      const apiMsg = msg.message;
      if (apiMsg?.content) {
        if (Array.isArray(apiMsg.content)) {
          const textParts: string[] = [];
          for (const block of apiMsg.content) {
            if (block.type === 'tool_result') {
              const rc = 'content' in block ? block.content : '';
              let resultText = '';
              if (typeof rc === 'string') {
                resultText = rc;
              } else if (Array.isArray(rc)) {
                resultText = (rc as { type: string; text?: string }[])
                  .filter((c) => c.type === 'text')
                  .map((c) => c.text ?? '')
                  .join('\n');
              }
              blocks.push({
                id: `${id}-tr-${'tool_use_id' in block ? String(block.tool_use_id) : ''}`,
                timestamp: ts,
                type: 'tool-result',
                toolResultForId: 'tool_use_id' in block ? String(block.tool_use_id) : '',
                toolResultContent: truncateResult(resultText, RESULT_MAX),
                toolResultIsError:
                  'is_error' in block ? (block as { is_error?: boolean }).is_error === true : false,
              });
            } else if (block.type === 'text') {
              textParts.push('text' in block ? String(block.text) : '');
            }
          }
          if (textParts.length > 0) {
            blocks.push({ id, timestamp: ts, type: 'user-prompt', text: textParts.join('\n') });
          }
        } else if (typeof apiMsg.content === 'string') {
          blocks.push({ id, timestamp: ts, type: 'user-prompt', text: apiMsg.content });
        }
      } else if (typeof msg.content === 'string') {
        blocks.push({ id, timestamp: ts, type: 'user-prompt', text: msg.content });
      }
      continue;
    }

    // ── Assistant blocks (thinking, text, tool_use) ──
    if (msg.type === 'assistant') {
      const apiMsg = msg.message;
      if (apiMsg?.content && Array.isArray(apiMsg.content)) {
        for (const block of apiMsg.content) {
          if (block.type === 'thinking') {
            blocks.push({
              id: `${id}-think`,
              timestamp: ts,
              type: 'thinking',
              thinkingText: block.thinking ?? '',
            });
          } else if (block.type === 'text') {
            blocks.push({
              id: `${id}-text`,
              timestamp: ts,
              type: 'text',
              text: 'text' in block ? String(block.text) : '',
            });
          } else if (block.type === 'tool_use') {
            blocks.push({
              id: `${id}-tool-${'id' in block ? String(block.id) : ''}`,
              timestamp: ts,
              type: 'tool-use',
              toolName: 'name' in block ? String(block.name) : 'unknown',
              toolInput: ('input' in block ? block.input : {}) as Record<string, unknown>,
              toolUseId: 'id' in block ? String(block.id) : '',
            });
          }
        }
      }
      continue;
    }
  }

  return blocks;
}

/** Scan subagent metadata and build subagent blocks + info list. */
export function buildSubagentBlocks(
  subagentEntries: readonly {
    agentId: string;
    agentType: string;
    messageCount: number;
    firstTimestamp?: string;
    firstPrompt?: string;
  }[]
): { subagents: SubagentInfo[]; blocks: TimelineBlock[] } {
  const subagents: SubagentInfo[] = [];
  const blocks: TimelineBlock[] = [];

  for (const entry of subagentEntries) {
    subagents.push({
      agentId: entry.agentId,
      agentType: entry.agentType,
      messageCount: entry.messageCount,
    });

    if (entry.firstTimestamp) {
      blocks.push({
        id: `subagent-${entry.agentId}`,
        timestamp: entry.firstTimestamp,
        type: 'subagent',
        subagentId: entry.agentId,
        subagentType: entry.agentType,
        subagentPrompt: (entry.firstPrompt ?? '').slice(0, 300),
      });
    }
  }

  return { subagents, blocks };
}

/** Build a complete TimelineResponse for a session. */
export function buildTimelineResponse(
  sessionId: string,
  rawMessages: readonly RawMessage[],
  subagentEntries: readonly {
    agentId: string;
    agentType: string;
    messageCount: number;
    firstTimestamp?: string;
    firstPrompt?: string;
  }[]
): TimelineResponse {
  const blocks = buildTimelineBlocks(rawMessages);
  const { subagents, blocks: subagentBlocks } = buildSubagentBlocks(subagentEntries);
  blocks.push(...subagentBlocks);
  blocks.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    sessionId,
    blocks,
    subagents,
    totalRawMessages: rawMessages.length,
  };
}

/** Build a TimelineResponse for a subagent's own conversation. */
export function buildSubagentTimelineResponse(
  sessionId: string,
  rawMessages: readonly RawMessage[]
): TimelineResponse {
  const blocks = buildTimelineBlocks(rawMessages);
  blocks.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    sessionId,
    blocks,
    subagents: [],
    totalRawMessages: rawMessages.length,
  };
}

/** Extract text from the first user message in a set of raw messages. */
export function extractFirstPrompt(messages: readonly RawMessage[]): string {
  for (const msg of messages) {
    if (msg.type === 'user') {
      return extractBlockText(msg.message?.content ?? msg.content ?? '');
    }
  }
  return '';
}
