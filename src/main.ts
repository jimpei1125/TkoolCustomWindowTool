// SCMDesigner エントリポイント（Phase 0: 調査/PoC、Phase 1: インスペクタ（読み取り専用））。
//
// Phase 0: 起動キーによるオーバーレイ表示切替、編集中のゲーム入力遮断PoC
// Phase 1: カスタムメニューシーン表示中のみ、全ウィンドウの選択枠+Idラベル表示、
//          クリック/ツリーでの選択、プロパティの読み取り表示
// GUI 編集・保存等は未実装（Phase 2 以降でフェーズごとに追加する）。
//
// CLAUDE.md「絶対に守るルール」6: すべての初期化は
// Utils.isOptionValid('test') && Utils.isNwjs() ガードの内側で行う。

import { createEditorState, selectWindow } from './editor/state';
import { InspectorOverlay } from './gizmo/overlay';
import { InspectorPanel } from './ui/panel';

(() => {
  if (!(Utils.isOptionValid('test') && Utils.isNwjs())) return;

  const DEFAULT_STARTUP_KEY = 'F9';

  function readStartupKey(): string {
    try {
      const params = PluginManagerEx.createParameter(document.currentScript as HTMLScriptElement);
      const key = params.startupKey;
      return typeof key === 'string' && key !== '' ? key : DEFAULT_STARTUP_KEY;
    } catch {
      // PluginCommonBase 未導入などプラグイン順序の問題があってもゲーム自体は落とさない
      return DEFAULT_STARTUP_KEY;
    }
  }

  function isCustomSceneSafe(): boolean {
    try {
      return typeof SceneManager.isCustomScene === 'function' && SceneManager.isCustomScene();
    } catch {
      // SceneCustomMenu 未導入などプラグイン順序の問題があってもゲーム自体は落とさない
      return false;
    }
  }

  const startupKey = readStartupKey();
  let editorActive = false;
  let overlayElement: HTMLDivElement | null = null;

  function createOverlay(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'scmd-overlay';
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.padding = '8px 12px';
    el.style.background = 'rgba(0, 0, 0, 0.75)';
    el.style.color = '#fff';
    el.style.font = '14px sans-serif';
    el.style.zIndex = '10000';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    return el;
  }

  // --- Phase 1: インスペクタ（読み取り専用） ---
  const editorState = createEditorState();
  let overlay: InspectorOverlay | null = null;
  let panel: InspectorPanel | null = null;
  let rafHandle: number | null = null;

  function handleSelect(id: string): void {
    selectWindow(editorState, id);
    panel?.render();
  }

  function startInspector(): void {
    if (!overlay) overlay = new InspectorOverlay(editorState, handleSelect);
    if (!panel) {
      panel = new InspectorPanel(editorState, handleSelect);
      document.body.appendChild(panel.el);
    }
    overlay.attach();
    const loop = (): void => {
      overlay?.refresh();
      panel?.render();
      rafHandle = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopInspector(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    overlay?.detach();
    if (panel) {
      panel.el.remove();
      panel = null;
    }
  }

  function setEditorActive(active: boolean): void {
    editorActive = active;
    if (!overlayElement) overlayElement = createOverlay();

    if (active) {
      overlayElement.style.display = 'block';
      if (isCustomSceneSafe()) {
        overlayElement.textContent = `SCMDesigner (Phase 1) — ${startupKey} で終了`;
        startInspector();
      } else {
        overlayElement.textContent = `SCMDesigner: カスタムメニューシーン表示中のみ利用できます（${startupKey} で終了）`;
      }
    } else {
      overlayElement.style.display = 'none';
      stopInspector();
    }
  }

  function toggleEditor(): void {
    setEditorActive(!editorActive);
  }

  // 入力遮断 PoC: 編集モード中は Input / TouchInput の更新を早期 return で止める。
  // SceneManager.update 経由で呼ばれるためウィンドウ側の入力処理まで止まるはずだが、
  // 実機（NW.js テストプレイ）での確認が Phase 0 完了条件。
  const originalInputUpdate = Input.update.bind(Input);
  Input.update = () => {
    if (editorActive) return;
    originalInputUpdate();
  };

  const originalTouchInputUpdate = TouchInput.update.bind(TouchInput);
  TouchInput.update = () => {
    if (editorActive) return;
    originalTouchInputUpdate();
  };

  window.addEventListener('keydown', (event) => {
    if (event.key.toUpperCase() === startupKey.toUpperCase()) {
      toggleEditor();
    }
  });
})();
