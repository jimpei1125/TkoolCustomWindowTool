// SCMDesigner エントリポイント（Phase 0: 調査 / PoC）。
//
// このファイルに実装済みなのは Phase 0 の完了条件のうち以下の PoC のみ:
//  - 起動キーによるオーバーレイの表示/非表示切り替え
//  - 編集中のゲーム入力遮断（Input / TouchInput の早期 return 方式）
// GUI 編集・保存等は未実装（Phase 1 以降でフェーズごとに追加する）。
//
// CLAUDE.md「絶対に守るルール」6: すべての初期化は
// Utils.isOptionValid('test') && Utils.isNwjs() ガードの内側で行う。

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
    el.textContent = `SCMDesigner (Phase 0 PoC) — ${startupKey} で終了`;
    document.body.appendChild(el);
    return el;
  }

  function setEditorActive(active: boolean): void {
    editorActive = active;
    if (active) {
      if (!overlayElement) overlayElement = createOverlay();
      overlayElement.style.display = 'block';
    } else if (overlayElement) {
      overlayElement.style.display = 'none';
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
