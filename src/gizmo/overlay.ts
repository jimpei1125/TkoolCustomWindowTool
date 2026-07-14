// カスタムメニューシーンの全ウィンドウに選択枠 + Id ラベルを重ねる PIXI レイヤー。
// Phase 1（読み取り専用インスペクタ）の範囲のため、ここでは表示と選択のみを行い、
// 移動・リサイズ等の編集操作は行わない（Phase 2 以降）。
//
// 実座標は SceneManager._scene._customWindowMap（CLAUDE.md 記載の公開済み内部構造）
// から取得する。SceneCustomMenu.js 側のロジックは一切変更しない。

import type { EditorState, InspectedWindow } from '../editor/state';
import { setWindows } from '../editor/state';

interface CustomMenuWindowLike {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  active: boolean;
}

interface CustomMenuSceneLike extends PixiDisplayObject {
  _customWindowMap?: Map<string, CustomMenuWindowLike>;
}

const FRAME_COLOR = 0x00ccff;
const SELECTED_COLOR = 0xffcc00;

export class InspectorOverlay {
  private readonly container = new PIXI.Container();
  private readonly frames = new Map<string, PixiGraphics>();
  private readonly labels = new Map<string, PixiText>();
  private attachedScene: CustomMenuSceneLike | null = null;

  constructor(
    private readonly state: EditorState,
    private readonly onSelect: (id: string) => void
  ) {}

  attach(): void {
    const scene = SceneManager._scene as CustomMenuSceneLike | null;
    if (!scene) return;
    scene.addChild(this.container);
    this.attachedScene = scene;
  }

  detach(): void {
    this.attachedScene?.removeChild(this.container);
    this.attachedScene = null;
    for (const [id, frame] of this.frames) {
      this.container.removeChild(frame);
      frame.destroy();
      this.labels.get(id)?.destroy();
    }
    this.frames.clear();
    this.labels.clear();
  }

  /** _customWindowMap から最新の実座標を読み取り、editor state に反映してから再描画する。 */
  refresh(): void {
    const scene = SceneManager._scene as CustomMenuSceneLike | null;
    const map = scene?._customWindowMap;
    const windows: InspectedWindow[] = [];
    if (map) {
      map.forEach((win, id) => {
        windows.push({
          id,
          x: win.x,
          y: win.y,
          width: win.width,
          height: win.height,
          visible: win.visible,
          active: win.active,
        });
      });
    }
    setWindows(this.state, windows);
    this.redraw(windows);
  }

  private redraw(windows: InspectedWindow[]): void {
    const currentIds = new Set(windows.map((w) => w.id));
    for (const [id, frame] of [...this.frames]) {
      if (currentIds.has(id)) continue;
      this.container.removeChild(frame);
      frame.destroy();
      const label = this.labels.get(id);
      if (label) {
        this.container.removeChild(label);
        label.destroy();
      }
      this.frames.delete(id);
      this.labels.delete(id);
    }

    for (const win of windows) {
      const selected = win.id === this.state.selectedId;
      const color = selected ? SELECTED_COLOR : FRAME_COLOR;

      let frame = this.frames.get(win.id);
      if (!frame) {
        frame = new PIXI.Graphics();
        frame.interactive = true;
        frame.on('pointerdown', () => this.onSelect(win.id));
        this.container.addChild(frame);
        this.frames.set(win.id, frame);
      }
      frame.clear();
      frame.lineStyle(selected ? 3 : 2, color, 1);
      frame.drawRect(0, 0, win.width, win.height);
      frame.x = win.x;
      frame.y = win.y;
      frame.visible = win.visible;

      let label = this.labels.get(win.id);
      if (!label) {
        label = new PIXI.Text(win.id, { fontSize: 14, fill: '#ffffff' });
        this.container.addChild(label);
        this.labels.set(win.id, label);
      }
      label.text = win.id;
      label.x = win.x + 2;
      label.y = win.y - 16;
      label.visible = win.visible;
    }
  }
}
