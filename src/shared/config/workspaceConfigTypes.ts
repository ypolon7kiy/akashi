import type { SourcePresetId } from '../sourcePresetId';
import type { ToolUserRoots } from '../toolUserRoots';

/** Injected at the extension composition root (reads VS Code settings). */
export type ActiveSourcePresetsGetter = () => ReadonlySet<SourcePresetId>;

export type IncludeHomeConfigGetter = () => boolean;

export type ToolUserRootsResolver = (homeDir: string) => ToolUserRoots;

/** Workbench `explorer.*` / `files.*` settings used by sidebar FS operations. */
export interface WorkbenchSidebarFsSettings {
  isConfirmDragAndDropEnabled(): boolean;
  getDeleteFlowSettings(): { enableTrash: boolean; confirmDelete: boolean };
}
