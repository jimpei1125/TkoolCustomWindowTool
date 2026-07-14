// バリデーション（SPEC.md §5.3）。ゲームグローバルに依存しない純関数。
//
// - Id の重複禁止
// - RelativeWindowIdX/Y・ListWindowId は WindowList 内で自分より前のウィンドウのみ参照可
//   （SceneCustomMenu が定義順に解決するため。前方参照はエラー）
// - FocusWindowId の同一シーン内存在チェック
// - スクリプト文字列内の Id 参照検出（リネーム時の警告用。自動書き換えはしない）

export interface ValidationIssue {
  severity: 'error' | 'warning';
  windowId?: string;
  field?: string;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function windowsOf(sceneData: Record<string, unknown>): Record<string, unknown>[] {
  const list = Array.isArray(sceneData.WindowList) ? sceneData.WindowList : [];
  return list.filter((w): w is Record<string, unknown> => asRecord(w) !== null);
}

/** シーン内の全 EventData を、参照元ラベル付きで列挙する。 */
function collectEvents(sceneData: Record<string, unknown>): Array<{ event: Record<string, unknown>; source: string }> {
  const events: Array<{ event: Record<string, unknown>; source: string }> = [];
  const push = (value: unknown, source: string) => {
    const ev = asRecord(value);
    if (ev) events.push({ event: ev, source });
  };

  push(sceneData.InitialEvent, 'Scene.InitialEvent');
  push(sceneData.ActorChangeEvent, 'Scene.ActorChangeEvent');

  for (const win of windowsOf(sceneData)) {
    const winId = asString(win.Id);
    push(win.DecisionEvent, `Window[${winId}].DecisionEvent`);
    push(win.CancelEvent, `Window[${winId}].CancelEvent`);
    push(win.CursorEvent, `Window[${winId}].CursorEvent`);

    const buttonEvents = Array.isArray(win.ButtonEvent) ? win.ButtonEvent : [];
    for (const be of buttonEvents) {
      const beRecord = asRecord(be);
      if (beRecord) push(beRecord.Event, `Window[${winId}].ButtonEvent`);
    }

    const commandList = Array.isArray(win.CommandList) ? win.CommandList : [];
    for (const cmd of commandList) {
      const cmdRecord = asRecord(cmd);
      if (cmdRecord) push(cmdRecord.DecisionEvent, `Window[${winId}].CommandList.DecisionEvent`);
    }
  }

  return events;
}

/** SceneData を検証し、重複 Id・前方参照・存在しない FocusWindowId をエラーとして報告する。 */
export function validateSceneData(sceneData: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const windows = windowsOf(sceneData);

  const idToIndex = new Map<string, number>();
  for (let i = 0; i < windows.length; i++) {
    const id = asString(windows[i]!.Id);
    if (!id) continue;
    if (idToIndex.has(id)) {
      issues.push({ severity: 'error', windowId: id, message: `ウィンドウ Id "${id}" が重複しています` });
    } else {
      idToIndex.set(id, i);
    }
  }

  const checkForwardRef = (win: Record<string, unknown>, index: number, field: string) => {
    const refId = asString(win[field]);
    if (!refId) return;
    const refIndex = idToIndex.get(refId);
    const id = asString(win.Id);
    if (refIndex === undefined) {
      issues.push({
        severity: 'error',
        windowId: id,
        field,
        message: `${field} が参照する Id "${refId}" が見つかりません`,
      });
    } else if (refIndex >= index) {
      issues.push({
        severity: 'error',
        windowId: id,
        field,
        message: `${field} は自分より前のウィンドウのみ参照できます（"${refId}" は前方参照または自己参照です）`,
      });
    }
  };

  for (let i = 0; i < windows.length; i++) {
    const win = windows[i]!;
    checkForwardRef(win, i, 'RelativeWindowIdX');
    checkForwardRef(win, i, 'RelativeWindowIdY');
    checkForwardRef(win, i, 'ListWindowId');
  }

  const allIds = new Set(idToIndex.keys());
  for (const { event, source } of collectEvents(sceneData)) {
    const focusId = asString(event.FocusWindowId);
    if (focusId && !allIds.has(focusId)) {
      issues.push({
        severity: 'error',
        message: `${source} が参照するウィンドウ Id "${focusId}" が見つかりません`,
      });
    }
  }

  return issues;
}

const SCRIPT_STRING_FIELDS = [
  'ListScript',
  'FilterScript',
  'MappingScript',
  'SortScript',
  'IsEnableScript',
  'ItemDrawMultiLineScript',
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scanForIdLiteral(value: unknown, pattern: RegExp, source: string, found: string[]): void {
  if (typeof value === 'string') {
    if (pattern.test(value)) found.push(source);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && pattern.test(item)) {
        found.push(source);
        return;
      }
    }
  }
}

/**
 * スクリプト文字列（ListScript 等）や Event.Script の中に、指定した Id が
 * クォート付き文字列リテラルとして出現する箇所を検出する（リネーム時の警告用）。
 * CLAUDE.md「絶対に守るルール」4 により、検出のみ行い自動書き換えはしない。
 */
export function findScriptReferences(sceneData: Record<string, unknown>, targetId: string): string[] {
  if (!targetId) return [];
  const found: string[] = [];
  const pattern = new RegExp(`['"\`]${escapeRegExp(targetId)}['"\`]`);

  for (const win of windowsOf(sceneData)) {
    const winId = asString(win.Id);
    for (const field of SCRIPT_STRING_FIELDS) {
      scanForIdLiteral(win[field], pattern, `Window[${winId}].${field}`, found);
    }
    scanForIdLiteral(win.ItemDrawScript, pattern, `Window[${winId}].ItemDrawScript`, found);

    const commandList = Array.isArray(win.CommandList) ? win.CommandList : [];
    for (const cmd of commandList) {
      const cmdRecord = asRecord(cmd);
      if (!cmdRecord) continue;
      scanForIdLiteral(cmdRecord.VisibleScript, pattern, `Window[${winId}].CommandList.VisibleScript`, found);
      scanForIdLiteral(cmdRecord.IsEnableScript, pattern, `Window[${winId}].CommandList.IsEnableScript`, found);
    }
  }

  for (const { event, source } of collectEvents(sceneData)) {
    scanForIdLiteral(event.Script, pattern, `${source}.Script`, found);
  }

  return found;
}
