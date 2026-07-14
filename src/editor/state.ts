// 編集セッション状態（SPEC.md §4.2 editor/state.ts）。
// ゲームグローバルに依存しないプレーンなデータ構造として持ち、
// 実インスタンスの読み取りは gizmo 層（overlay.ts）、
// plugins.js の読み書きは bridge 層の責務とする。
//
// Phase 3 メモ: 新規追加したウィンドウはゲーム再起動まで実インスタンスが
// 存在しない（SPEC.md §9 Phase 3 のスコープ判断：ライブ反映せず保存→再起動で
// 確認する方式のため）。そのため、ツリー表示やプロパティ編集は
// `state.windows`（実インスタンスのライブスナップショット）ではなく、
// `state.sceneData.WindowList`（編集中モデル）を正とする。

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

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
  /** _customWindowMap から読み取った実インスタンスのライブスナップショット。 */
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

/** 編集中の SceneData.WindowList を配列として取得する（未ロード時は空配列）。 */
export function getWindowList(state: EditorState): Record<string, unknown>[] {
  const list = state.sceneData?.WindowList;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

/** ウィンドウ一覧（ライブスナップショット）を更新する。 */
export function setWindows(state: EditorState, windows: InspectedWindow[]): void {
  state.windows = windows;
  if (state.selectedId !== null) {
    const inLive = windows.some((w) => w.id === state.selectedId);
    const inConfig = getWindowList(state).some((w) => w.Id === state.selectedId);
    if (!inLive && !inConfig) state.selectedId = null;
  }
}

export function selectWindow(state: EditorState, id: string | null): void {
  state.selectedId = id;
}

export function getSelectedWindow(state: EditorState): InspectedWindow | null {
  return state.windows.find((w) => w.id === state.selectedId) ?? null;
}

/** 編集中の SceneData から、指定 Id の WindowData 設定を取得する。 */
export function getWindowConfig(state: EditorState, id: string): Record<string, unknown> | null {
  const found = getWindowList(state).find((w) => w.Id === id);
  return found ?? null;
}

export function isWindowIdTaken(state: EditorState, id: string): boolean {
  return getWindowList(state).some((w) => w.Id === id);
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

// --- Phase 3: 構造編集（追加・削除・複製・並べ替え・リネーム） ---

/** テンプレート等から生成した WindowData を WindowList の末尾に追加する。 */
export function addWindow(state: EditorState, windowData: Record<string, unknown>): void {
  if (!state.sceneData) return;
  const list = getWindowList(state);
  list.push(windowData);
  state.sceneData.WindowList = list;
  markDirty(state);
}

export function removeWindow(state: EditorState, id: string): void {
  if (!state.sceneData) return;
  const list = getWindowList(state).filter((w) => w.Id !== id);
  state.sceneData.WindowList = list;
  if (state.selectedId === id) state.selectedId = null;
  markDirty(state);
}

/** 指定ウィンドウを直後に複製する。newId は呼び出し側で一意性を確認して渡すこと。 */
export function duplicateWindow(state: EditorState, id: string, newId: string): void {
  if (!state.sceneData) return;
  const list = getWindowList(state);
  const index = list.findIndex((w) => w.Id === id);
  if (index === -1) return;
  const copy = structuredClone(list[index]!);
  copy.Id = newId;
  list.splice(index + 1, 0, copy);
  state.sceneData.WindowList = list;
  markDirty(state);
}

export function moveWindow(state: EditorState, id: string, direction: 'up' | 'down'): void {
  if (!state.sceneData) return;
  const list = getWindowList(state);
  const index = list.findIndex((w) => w.Id === id);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return;
  const tmp = list[index]!;
  list[index] = list[targetIndex]!;
  list[targetIndex] = tmp;
  state.sceneData.WindowList = list;
  markDirty(state);
}

/**
 * ウィンドウ Id をリネームし、同一シーン内の参照（RelativeWindowIdX/Y, ListWindowId,
 * FocusWindowId）を追従させる。スクリプト文字列内の参照は変更しない
 * （CLAUDE.md「絶対に守るルール」4。呼び出し側で findScriptReferences により警告する）。
 */
export function renameWindow(state: EditorState, oldId: string, newId: string): void {
  if (!state.sceneData || !newId || oldId === newId) return;
  const list = getWindowList(state);
  const target = list.find((w) => w.Id === oldId);
  if (!target) return;
  target.Id = newId;

  const replaceIfMatches = (record: Record<string, unknown>, field: string) => {
    if (record[field] === oldId) record[field] = newId;
  };
  for (const win of list) {
    replaceIfMatches(win, 'RelativeWindowIdX');
    replaceIfMatches(win, 'RelativeWindowIdY');
    replaceIfMatches(win, 'ListWindowId');
  }

  const replaceFocus = (value: unknown) => {
    const ev = asRecord(value);
    if (ev) replaceIfMatches(ev, 'FocusWindowId');
  };
  replaceFocus(state.sceneData.InitialEvent);
  replaceFocus(state.sceneData.ActorChangeEvent);
  for (const win of list) {
    replaceFocus(win.DecisionEvent);
    replaceFocus(win.CancelEvent);
    replaceFocus(win.CursorEvent);
    const buttonEvents = Array.isArray(win.ButtonEvent) ? win.ButtonEvent : [];
    for (const be of buttonEvents) {
      const beRecord = asRecord(be);
      if (beRecord) replaceFocus(beRecord.Event);
    }
    const commandList = Array.isArray(win.CommandList) ? win.CommandList : [];
    for (const cmd of commandList) {
      const cmdRecord = asRecord(cmd);
      if (cmdRecord) replaceFocus(cmdRecord.DecisionEvent);
    }
  }

  if (state.selectedId === oldId) state.selectedId = newId;
  markDirty(state);
}
