import type { TimelineBlock, ToolExecution } from './model';

/** Build ToolExecution entries by matching tool-use blocks with their tool-result blocks. */
export function buildToolExecutions(blocks: readonly TimelineBlock[]): ToolExecution[] {
  const starts = new Map<
    string,
    { toolName: string; startTime: string; toolInput?: Record<string, unknown> }
  >();
  const executions: ToolExecution[] = [];

  for (const block of blocks) {
    if (block.type === 'tool-use' && block.toolUseId) {
      starts.set(block.toolUseId, {
        toolName: block.toolName ?? 'unknown',
        startTime: block.timestamp,
        toolInput: block.toolInput,
      });
    }

    if (block.type === 'tool-result' && block.toolResultForId) {
      const start = starts.get(block.toolResultForId);
      if (start) {
        const startMs = new Date(start.startTime).getTime();
        const endMs = new Date(block.timestamp).getTime();
        executions.push({
          toolUseId: block.toolResultForId,
          toolName: start.toolName,
          startTime: start.startTime,
          endTime: block.timestamp,
          durationMs: Math.max(0, endMs - startMs),
          toolInput: start.toolInput,
        });
      }
    }
  }

  return executions;
}

/**
 * Assign non-overlapping rows using a greedy bin-packing algorithm.
 * Sort by start time, then pack each execution into the first row
 * where it doesn't overlap with an existing execution.
 */
export function assignGanttRows(execs: readonly ToolExecution[]): ToolExecution[] {
  const sorted = [...execs].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const rowEnds: number[] = [];

  for (const exec of sorted) {
    const startMs = new Date(exec.startTime).getTime();
    let assigned = false;

    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= startMs) {
        exec.row = r;
        rowEnds[r] = new Date(exec.endTime).getTime();
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      exec.row = rowEnds.length;
      rowEnds.push(new Date(exec.endTime).getTime());
    }
  }

  return sorted;
}
