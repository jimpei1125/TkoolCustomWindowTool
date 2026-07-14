// 編集セッション状態（SPEC.md §4.2 editor/state.ts）。
// ゲームグローバルに依存しないプレーンなデータ構造として持ち、
// 実インスタンスの読み取りは gizmo 層（overlay.ts）の責務とする。

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
}

export function createEditorState(): EditorState {
  return { windows: [], selectedId: null };
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
