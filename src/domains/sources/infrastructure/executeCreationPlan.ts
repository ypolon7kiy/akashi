import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  ArtifactCreationPlan,
  ArtifactOperation,
  WriteFileOp,
  JsonMergeOp,
} from '../domain/artifactOperation';
import { isPathAllowedForWorkspaceOrHome } from '../../../shared/extensionHost/isPathAllowedForWorkspaceOrHome';

export type ExecuteCreationPlanResult =
  | { ok: true; openPath?: string }
  | { ok: false; error: string };

function validatePlan(plan: ArtifactCreationPlan): string | null {
  for (const op of plan.operations) {
    if (!isPathAllowedForWorkspaceOrHome(op.absolutePath)) {
      return `Path not allowed: ${op.absolutePath}`;
    }
  }
  return null;
}

async function executeWriteFile(op: WriteFileOp): Promise<string | null> {
  const fileUri = vscode.Uri.file(op.absolutePath);
  try {
    await vscode.workspace.fs.stat(fileUri);
    return `Already exists: ${op.absolutePath}`;
  } catch {
    // absent — ok to create
  }
  const parentUri = vscode.Uri.file(path.dirname(op.absolutePath));
  await vscode.workspace.fs.createDirectory(parentUri);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(op.content, 'utf8'));
  return null;
}

async function executeJsonMerge(op: JsonMergeOp): Promise<string | null> {
  const prompt = op.description.trim() || `Apply JSON merge to ${path.basename(op.absolutePath)}?`;
  const choice = await vscode.window.showWarningMessage(prompt, { modal: true }, 'Continue');
  if (choice !== 'Continue') {
    return 'Cancelled.';
  }

  const fileUri = vscode.Uri.file(op.absolutePath);
  let existing: Record<string, unknown> = {};

  try {
    const raw = await vscode.workspace.fs.readFile(fileUri);
    try {
      existing = JSON.parse(Buffer.from(raw).toString('utf8')) as Record<string, unknown>;
    } catch {
      return `Cannot update ${op.absolutePath}: file exists but is not valid JSON.`;
    }
  } catch (e) {
    if (e instanceof vscode.FileSystemError && e.code === 'FileNotFound') {
      const parentUri = vscode.Uri.file(path.dirname(op.absolutePath));
      await vscode.workspace.fs.createDirectory(parentUri);
      existing = {};
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      return `Cannot read ${op.absolutePath}: ${msg}`;
    }
  }

  if (op.jsonPath === '') {
    existing = { ...existing, ...(op.value as Record<string, unknown>) };
  } else {
    const segments = op.jsonPath.split('.');
    let target: Record<string, unknown> = existing;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (typeof target[seg] !== 'object' || target[seg] === null) {
        target[seg] = {};
      }
      target = target[seg] as Record<string, unknown>;
    }
    const lastSeg = segments[segments.length - 1];
    const current = target[lastSeg];
    if (Array.isArray(current) && Array.isArray(op.value)) {
      const merged: unknown[] = [];
      for (const el of current) {
        merged.push(el);
      }
      for (const el of op.value) {
        merged.push(el);
      }
      target[lastSeg] = merged;
    } else if (
      typeof current === 'object' &&
      current !== null &&
      !Array.isArray(current) &&
      typeof op.value === 'object' &&
      op.value !== null &&
      !Array.isArray(op.value)
    ) {
      target[lastSeg] = {
        ...(current as Record<string, unknown>),
        ...(op.value as Record<string, unknown>),
      };
    } else {
      target[lastSeg] = op.value;
    }
  }

  if (typeof op.ensureTopLevelVersionIfMissing === 'number') {
    const v = existing.version;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      existing.version = op.ensureTopLevelVersionIfMissing;
    }
  }

  await vscode.workspace.fs.writeFile(
    fileUri,
    Buffer.from(JSON.stringify(existing, null, 2) + '\n', 'utf8')
  );
  return null;
}

async function executeOp(op: ArtifactOperation): Promise<string | null> {
  switch (op.type) {
    case 'writeFile':
      return executeWriteFile(op);
    case 'jsonMerge':
      return executeJsonMerge(op);
    default: {
      const _exhaustive: never = op;
      return `Unknown operation type: ${(_exhaustive as ArtifactOperation).type}`;
    }
  }
}

/**
 * Validate and execute all operations in a creation plan.
 *
 * - All operation paths are validated before any I/O (fail-fast).
 * - Operations run **sequentially** in order. The plan is **not** transactional: if a later
 *   operation fails, earlier writes and merges are already applied.
 */
export async function executeCreationPlan(
  plan: ArtifactCreationPlan
): Promise<ExecuteCreationPlanResult> {
  const validationError = validatePlan(plan);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  for (const op of plan.operations) {
    const err = await executeOp(op);
    if (err) {
      return { ok: false, error: err };
    }
  }

  const openPath =
    plan.openAfterCreate ??
    plan.operations.find((op): op is WriteFileOp => op.type === 'writeFile')?.absolutePath;

  return { ok: true, openPath };
}
