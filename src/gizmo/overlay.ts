// カスタムメニューシーンの全ウィンドウに選択枠 + Id ラベルを重ねる PIXI レイヤー。
// Phase 2 では選択枠クリックでの移動ドラッグ、8方向ハンドルでのリサイズ、
// グリッド/端吸着とガイド線表示を追加する。
//
// ドラッグ中のプレビューは実ウィンドウ（Window.move）を直接書き換えて行う
// （SPEC.md §8.1）。plugins.js への保存や RelativeWindowIdX/Y の計算は
// main.ts 側（onDragCommit コールバック）が担当する。
//
// 実座標は SceneManager._scene._customWindowMap（CLAUDE.md 記載の公開済み内部構造）
// から取得する。SceneCustomMenu.js 側のロジックは一切変更しない。

import type { EditorState, InspectedWindow } from '../editor/state';
import { setWindows } from '../editor/state';
import { beginDrag, updateDrag, type DragMode, type DragSession } from './drag';
import type { GuideLine, Rect, SnapContext } from './snap';

interface CustomMenuWindowLike {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  active: boolean;
  move?(x: number, y: number, width: number, height: number): void;
}

interface CustomMenuSceneLike extends PixiDisplayObject {
  _customWindowMap?: Map<string, CustomMenuWindowLike>;
  mainAreaTop?(): number;
}

const FRAME_COLOR = 0x00ccff;
const SELECTED_COLOR = 0xffcc00;
const HANDLE_COLOR = 0xffffff;
const GUIDE_COLOR = 0xff00ff;
const HANDLE_SIZE = 8;

const HANDLE_MODES: ReadonlyArray<{ mode: DragMode; dx: number; dy: number }> = [
  { mode: 'resize-nw', dx: 0, dy: 0 },
  { mode: 'resize-n', dx: 0.5, dy: 0 },
  { mode: 'resize-ne', dx: 1, dy: 0 },
  { mode: 'resize-w', dx: 0, dy: 0.5 },
  { mode: 'resize-e', dx: 1, dy: 0.5 },
  { mode: 'resize-sw', dx: 0, dy: 1 },
  { mode: 'resize-s', dx: 0.5, dy: 1 },
  { mode: 'resize-se', dx: 1, dy: 1 },
];

export interface OverlayCallbacks {
  onSelect(id: string): void;
  /** ドラッグ確定時に、最終的な実座標矩形を渡す。モデル更新は呼び出し側の責務。 */
  onDragCommit(id: string, rect: Rect): void;
}

export class InspectorOverlay {
  private readonly container = new PIXI.Container();
  private readonly guideLayer = new PIXI.Graphics();
  private readonly frames = new Map<string, PixiGraphics>();
  private readonly labels = new Map<string, PixiText>();
  private readonly handles = new Map<DragMode, PixiGraphics>();
  private attachedScene: CustomMenuSceneLike | null = null;
  private dragSession: DragSession | null = null;
  private windowMoveHandler: ((e: MouseEvent) => void) | null = null;
  private windowUpHandler: ((e: MouseEvent) => void) | null = null;

  constructor(
    private readonly state: EditorState,
    private readonly callbacks: OverlayCallbacks
  ) {
    this.container.addChild(this.guideLayer);
  }

  attach(): void {
    const scene = SceneManager._scene as CustomMenuSceneLike | null;
    if (!scene) return;
    scene.addChild(this.container);
    this.attachedScene = scene;
  }

  detach(): void {
    this.endDrag();
    this.attachedScene?.removeChild(this.container);
    this.attachedScene = null;
    for (const [id, frame] of this.frames) {
      this.container.removeChild(frame);
      frame.destroy();
      this.labels.get(id)?.destroy();
    }
    this.frames.clear();
    this.labels.clear();
    this.clearHandles();
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
        frame.on('pointerdown', (e) => this.handleFramePointerDown(win.id, e));
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

    this.redrawHandles();
  }

  private redrawHandles(): void {
    this.clearHandles();
    if (this.dragSession) return; // ドラッグ中はハンドルを隠す
    const selected = this.state.windows.find((w) => w.id === this.state.selectedId);
    if (!selected) return;

    for (const { mode, dx, dy } of HANDLE_MODES) {
      const handle = new PIXI.Graphics();
      handle.interactive = true;
      handle.on('pointerdown', (e) => this.handleHandlePointerDown(selected.id, mode, e));
      handle.clear();
      handle.beginFill(HANDLE_COLOR, 1);
      handle.drawRect(-HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      handle.endFill();
      handle.x = selected.x + selected.width * dx;
      handle.y = selected.y + selected.height * dy;
      this.container.addChild(handle);
      this.handles.set(mode, handle);
    }
  }

  private clearHandles(): void {
    for (const [, handle] of this.handles) {
      this.container.removeChild(handle);
      handle.destroy();
    }
    this.handles.clear();
  }

  private handleFramePointerDown(id: string, e: PixiInteractionEvent): void {
    this.callbacks.onSelect(id);
    const win = this.state.windows.find((w) => w.id === id);
    if (!win) return;
    this.startDragSession(id, 'move', { x: e.data.global.x, y: e.data.global.y }, win);
  }

  private handleHandlePointerDown(id: string, mode: DragMode, e: PixiInteractionEvent): void {
    const win = this.state.windows.find((w) => w.id === id);
    if (!win) return;
    this.startDragSession(id, mode, { x: e.data.global.x, y: e.data.global.y }, win);
  }

  private startDragSession(id: string, mode: DragMode, pointer: { x: number; y: number }, rect: Rect): void {
    this.dragSession = beginDrag(id, mode, pointer, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
    this.clearHandles();

    this.windowMoveHandler = (ev: MouseEvent) => this.handlePointerMove(ev);
    this.windowUpHandler = (ev: MouseEvent) => this.handlePointerUp(ev);
    window.addEventListener('mousemove', this.windowMoveHandler);
    window.addEventListener('mouseup', this.windowUpHandler);
  }

  private buildSnapContext(excludeId: string): SnapContext {
    const mainAreaTop =
      typeof this.attachedScene?.mainAreaTop === 'function' ? this.attachedScene.mainAreaTop() : 0;
    return {
      otherRects: this.state.windows.filter((w) => w.id !== excludeId),
      screenWidth: Graphics.width,
      screenHeight: Graphics.height,
      mainAreaTop,
      gridEnabled: this.state.gridEnabled,
    };
  }

  private handlePointerMove(ev: MouseEvent): void {
    const session = this.dragSession;
    if (!session) return;
    const pointer = { x: Graphics.pageToCanvasX(ev.clientX), y: Graphics.pageToCanvasY(ev.clientY) };
    const { rect, guides } = updateDrag(session, pointer, this.buildSnapContext(session.id));
    this.applyPreview(session.id, rect);
    this.drawGuides(guides);
  }

  private handlePointerUp(ev: MouseEvent): void {
    const session = this.dragSession;
    if (!session) return;
    const pointer = { x: Graphics.pageToCanvasX(ev.clientX), y: Graphics.pageToCanvasY(ev.clientY) };
    const { rect } = updateDrag(session, pointer, this.buildSnapContext(session.id));
    this.applyPreview(session.id, rect);
    this.endDrag();
    this.callbacks.onDragCommit(session.id, rect);
    this.refresh();
  }

  private endDrag(): void {
    if (this.windowMoveHandler) window.removeEventListener('mousemove', this.windowMoveHandler);
    if (this.windowUpHandler) window.removeEventListener('mouseup', this.windowUpHandler);
    this.windowMoveHandler = null;
    this.windowUpHandler = null;
    this.dragSession = null;
    this.guideLayer.clear();
  }

  private applyPreview(id: string, rect: Rect): void {
    const win = this.attachedScene?._customWindowMap?.get(id);
    if (!win) return;
    if (typeof win.move === 'function') {
      win.move(rect.x, rect.y, rect.width, rect.height);
    } else {
      win.x = rect.x;
      win.y = rect.y;
      win.width = rect.width;
      win.height = rect.height;
    }
  }

  private drawGuides(guides: GuideLine[]): void {
    this.guideLayer.clear();
    this.guideLayer.lineStyle(1, GUIDE_COLOR, 0.9);
    for (const guide of guides) {
      if (guide.orientation === 'vertical') {
        this.guideLayer.moveTo(guide.position, 0);
        this.guideLayer.lineTo(guide.position, Graphics.height);
      } else {
        this.guideLayer.moveTo(0, guide.position);
        this.guideLayer.lineTo(Graphics.width, guide.position);
      }
    }
  }
}
