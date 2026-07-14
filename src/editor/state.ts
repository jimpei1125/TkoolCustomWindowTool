// 編集セッション状態（SPEC.md §4.2 editor/state.ts）。
// ゲームグローバルに依存しないプレーンなデータ構造として持ち、
// 実インスタンスの読み取りは gizmo 層（overlay.ts）、
// plugins.js の読み書きは bridge 層の責務とする。

export interface InspectedWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  active: boolean;
}

export interface EditorState {
  windows: InspectedWindow[];
  selectedId: string | null;

  /** plugins.js から読み込んだ、編集対象シーンの SceneData（Phase 2〜）。 */
  sceneData: Record<string, unknown> | null;
  /** SceneCustomMenu プラグインの parameters 内で sceneData が格納されているキー。 */
  sceneKey: string | null;
  /** 読み込み時点の plugins.js の mtime（保存時の競合検出に使用）。 */
  loadedMtimeMs: number | null;
  dirty: boolean;
  gridEnabled: boolean;
}

export function createEditorState(): EditorState {
  return {
    windows: [],
    selectedId: null,
    sceneData: null,
    sceneKey: null,
    loadedMtimeMs: null,
    dirty: false,
    gridEnabled: true,
  };
}

/** ウィンドウ一覧を更新する。選択中の Id が一覧から消えていたら選択を解除する。 */
export function setWindows(state: EditorState, windows: InspectedWindow[]): void {
  state.windows = windows;
  if (state.selectedId !== null && !windows.some((w) => w.id === state.selectedId)) {
    state.selectedId = null;
  }
}

export function selectWindow(state: EditorState, id: string | null): void {
  state.selectedId = id;
}

export function getSelectedWindow(state: EditorState): InspectedWindow | null {
  return state.windows.find((w) => w.id === state.selectedId) ?? null;
}

/** 編集中の SceneData から、指定 Id の WindowData 設定を取得する（配置編集の参照用）。 */
export function getWindowConfig(state: EditorState, id: string): Record<string, unknown> | null {
  const list = state.sceneData?.WindowList;
  if (!Array.isArray(list)) return null;
  const found = list.find((w) => typeof w === 'object' && w !== null && (w as Record<string, unknown>).Id === id);
  return (found as Record<string, unknown> | undefined) ?? null;
}

/** ロード結果を編集状態に反映する（読み込み直後・破棄後の再読み込み時に使用）。 */
export function applyLoadedScene(
  state: EditorState,
  sceneKey: string,
  sceneData: Record<string, unknown>,
  mtimeMs: number
): void {
  state.sceneKey = sceneKey;
  state.sceneData = sceneData;
  state.loadedMtimeMs = mtimeMs;
  state.dirty = false;
}

export function markDirty(state: EditorState): void {
  state.dirty = true;
}

export function markSaved(state: EditorState, mtimeMs: number): void {
  state.dirty = false;
  state.loadedMtimeMs = mtimeMs;
}
