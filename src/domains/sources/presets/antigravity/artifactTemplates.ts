import * as path from 'node:path';
import type { ArtifactTemplate, ArtifactPlannerContext } from '../../domain/artifactTemplate';
import { simpleFileTemplate, folderFileTemplate } from '../../domain/artifactTemplateHelpers';
import { SourceCategoryId } from '../../domain/sourceTags';

function antigravityGeminiWorkspaceTemplate(): ArtifactTemplate {
  return {
    id: 'antigravity/gemini/workspace',
    label: 'New GEMINI.md (project root)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    input: {
      title: 'Document title',
      prompt: 'First-line heading in GEMINI.md',
      valueKind: 'freeText',
    },
    plan(ctx: ArtifactPlannerContext) {
      if (!ctx.workspaceRoot) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      const abs = path.join(ctx.workspaceRoot, 'GEMINI.md');
      const title = ctx.userInput.trim();
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: abs,
              content: `# ${title}\n\n`,
            },
          ],
          openAfterCreate: abs,
        },
      };
    },
  };
}

function antigravityUserGeminiTemplate(): ArtifactTemplate {
  return {
    id: 'antigravity/gemini/user',
    label: 'New GEMINI.md (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    scope: 'user',
    input: {
      title: 'Document title',
      prompt: 'Heading for GEMINI.md (e.g. GEMINI or project name)',
    },
    plan(ctx: ArtifactPlannerContext) {
      const abs = path.join(ctx.roots.geminiUserRoot, 'GEMINI.md');
      const title = ctx.userInput.trim() || 'GEMINI';
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: abs,
              content: `# ${title}\n\n`,
            },
          ],
          openAfterCreate: abs,
        },
      };
    },
  };
}

export const antigravityArtifactTemplates: readonly ArtifactTemplate[] = [
  folderFileTemplate({
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  folderFileTemplate({
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.geminiUserRoot, 'antigravity', 'skills'),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  simpleFileTemplate({
    id: 'antigravity/context/workspace',
    label: 'New Context File (custom name)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  antigravityGeminiWorkspaceTemplate(),
  antigravityUserGeminiTemplate(),
];
