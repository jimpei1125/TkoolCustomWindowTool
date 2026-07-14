// SCMDesigner エントリポイント。
//
// Phase 0: 起動キーによるオーバーレイ表示切替、編集中のゲーム入力遮断PoC
// Phase 1: カスタムメニューシーン表示中のみ、全ウィンドウの選択枠+Idラベル表示、
//          クリック/ツリーでの選択、プロパティの読み取り表示
// Phase 2: 移動/リサイズ（グリッド・端吸着・ガイド線）、plugins.js からの
//          シーン読み込み、バックアップ付き保存、外部変更の競合検出
// 中身/動作タブの編集、Undo/Redo 等は未実装（Phase 3 以降で追加する）。
//
// CLAUDE.md「絶対に守るルール」6: すべての初期化は
// Utils.isOptionValid('test') && Utils.isNwjs() ガードの内側で行う。

import { getBackupDir, getPluginsFilePath } from './bridge/projectPath';
import { loadScmSceneForId, PluginsFileConflictError, saveScmScene } from './bridge/pluginsFile';
import {
  applyLoadedScene,
  createEditorState,
  getWindowConfig,
  markDirty,
  markSaved,
  selectWindow,
} from './editor/state';
import { InspectorOverlay } from './gizmo/overlay';
import type { ResolvedRect } from './model/placement';
import { computeStoredPlacement } from './model/placement';
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

  // SceneManager.isCustomScene(id) は「引数のシーンIDと現在のシーンが一致するか」を
  // 判定する関数で、引数なしでは常に false を返す（実ソース確認済み）。
  // 「現在がカスタムシーン一般かどうか」の判定には instanceof を使う。
  function isCustomSceneSafe(): boolean {
    try {
      return SceneManager._scene instanceof Scene_CustomMenu;
    } catch {
      // SceneCustomMenu 未導入などプラグイン順序の問題があってもゲーム自体は落とさない
      return false;
    }
  }

  /** 現在のシーンの識別子（SceneData.Id）を取得する。カスタムシーンでなければ null。 */
  function getCurrentSceneId(): string | null {
    try {
      if (!(SceneManager._scene instanceof Scene_CustomMenu)) return null;
      const id = PluginManagerEx.findClassName(SceneManager._scene);
      return typeof id === 'string' && id !== '' ? id : null;
    } catch {
      return null;
    }
  }

  function getMainAreaTopSafe(): number {
    try {
      const scene = SceneManager._scene as { mainAreaTop?: () => number } | null;
      return typeof scene?.mainAreaTop === 'function' ? scene.mainAreaTop() : 0;
    } catch {
      return 0;
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

  // --- Phase 1/2: インスペクタ + 配置編集 ---
  const editorState = createEditorState();
  let overlay: InspectorOverlay | null = null;
  let panel: InspectorPanel | null = null;
  let rafHandle: number | null = null;

  function handleSelect(id: string): void {
    selectWindow(editorState, id);
    panel?.render();
  }

  function findLiveRect(id: string): ResolvedRect | undefined {
    const win = editorState.windows.find((w) => w.id === id);
    return win ? { x: win.x, y: win.y, width: win.width, height: win.height } : undefined;
  }

  /** ドラッグ確定時: 実座標から保存値を逆算し、編集中の SceneData モデルへ反映する。 */
  function handleDragCommit(id: string, rect: ResolvedRect): void {
    const config = getWindowConfig(editorState, id);
    if (!config) return;

    const originX = (typeof config.originX === 'number' ? config.originX : 0) as 0 | 1 | 2;
    const relativeIdX = typeof config.RelativeWindowIdX === 'string' ? config.RelativeWindowIdX : '';
    const relativeIdY = typeof config.RelativeWindowIdY === 'string' ? config.RelativeWindowIdY : '';

    const stored = computeStoredPlacement(
      { x: rect.x, y: rect.y },
      {
        originX,
        width: rect.width,
        relativeParentX: relativeIdX ? findLiveRect(relativeIdX) : undefined,
        relativeParentY: relativeIdY ? findLiveRect(relativeIdY) : undefined,
        mainAreaTop: getMainAreaTopSafe(),
      }
    );

    config.x = stored.x;
    config.y = stored.y;
    config.width = rect.width;
    config.height = rect.height;
    markDirty(editorState);
  }

  /** 編集中モデルが、現在表示中シーンの Id と一致するか。 */
  function sceneDataMatchesCurrentScene(): boolean {
    const currentId = getCurrentSceneId();
    return currentId !== null && editorState.sceneData?.Id === currentId;
  }

  function loadSceneData(): void {
    const sceneId = getCurrentSceneId();
    if (!sceneId) return;
    try {
      const loaded = loadScmSceneForId(getPluginsFilePath(), sceneId);
      if (loaded) {
        applyLoadedScene(editorState, loaded.sceneKey, loaded.sceneData, loaded.mtimeMs);
        panel?.setStatusMessage(`シーン "${sceneId}" (${loaded.sceneKey}) を plugins.js から読み込みました`);
      } else {
        panel?.setStatusMessage(`plugins.js 内にシーン "${sceneId}" の定義が見つかりませんでした`, true);
      }
    } catch (err) {
      panel?.setStatusMessage(`読み込みエラー: ${(err as Error).message}`, true);
    }
  }

  function handleSave(): void {
    if (!editorState.sceneKey || !editorState.sceneData || editorState.loadedMtimeMs === null) return;
    try {
      const result = saveScmScene(
        getPluginsFilePath(),
        getBackupDir(),
        editorState.sceneKey,
        editorState.sceneData,
        editorState.loadedMtimeMs
      );
      markSaved(editorState, result.mtimeMs);
      panel?.setStatusMessage('plugins.js に保存しました（バックアップ作成済み）');
    } catch (err) {
      if (err instanceof PluginsFileConflictError) {
        panel?.setStatusMessage(err.message, true);
      } else {
        panel?.setStatusMessage(`保存エラー: ${(err as Error).message}`, true);
      }
    }
  }

  function handleDiscard(): void {
    loadSceneData();
  }

  function handleToggleGrid(enabled: boolean): void {
    editorState.gridEnabled = enabled;
  }

  function startInspector(): void {
    if (!overlay) {
      overlay = new InspectorOverlay(editorState, { onSelect: handleSelect, onDragCommit: handleDragCommit });
    }
    if (!panel) {
      panel = new InspectorPanel(editorState, {
        onSelect: handleSelect,
        onSave: handleSave,
        onDiscard: handleDiscard,
        onToggleGrid: handleToggleGrid,
      });
      document.body.appendChild(panel.el);
    }
    overlay.attach();
    overlay.refresh();
    if (!sceneDataMatchesCurrentScene()) {
      loadSceneData();
    }
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
        overlayElement.textContent = `SCMDesigner (Phase 2) — ${startupKey} で終了`;
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
