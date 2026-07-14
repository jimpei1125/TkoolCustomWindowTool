// ドラッグ移動 / リサイズの純粋な矩形計算（SPEC.md §4.2 gizmo/drag.ts）。
// ゲームグローバル・PIXI に依存しない。DOM/PIXI との配線は gizmo/overlay.ts が行う。

import type { Rect, SnapContext } from './snap';
import { computeSnap } from './snap';

export type DragMode =
  | 'move'
  | 'resize-n'
  | 'resize-s'
  | 'resize-e'
  | 'resize-w'
  | 'resize-ne'
  | 'resize-nw'
  | 'resize-se'
  | 'resize-sw';

export interface DragSession {
  readonly id: string;
  readonly mode: DragMode;
  readonly startPointer: { x: number; y: number };
  readonly startRect: Rect;
}

const MIN_SIZE = 24;

export function beginDrag(
  id: string,
  mode: DragMode,
  pointer: { x: number; y: number },
  startRect: Rect
): DragSession {
  return { id, mode, startPointer: pointer, startRect };
}

/** ポインタ位置から現在のドラッグ結果の矩形を計算する（グリッド/端吸着込み）。 */
export function updateDrag(
  session: DragSession,
  pointer: { x: number; y: number },
  ctx: SnapContext
): { rect: Rect; guides: ReturnType<typeof computeSnap>['guides'] } {
  const dx = pointer.x - session.startPointer.x;
  const dy = pointer.y - session.startPointer.y;
  const rect: Rect = { ...session.startRect };

  if (session.mode === 'move') {
    rect.x = session.startRect.x + dx;
    rect.y = session.startRect.y + dy;
    const snap = computeSnap(rect, ctx);
    rect.x = snap.x;
    rect.y = snap.y;
    return { rect, guides: snap.guides };
  }

  if (session.mode.includes('e')) {
    rect.width = Math.max(MIN_SIZE, session.startRect.width + dx);
  }
  if (session.mode.includes('w')) {
    const newWidth = Math.max(MIN_SIZE, session.startRect.width - dx);
    rect.x = session.startRect.x + (session.startRect.width - newWidth);
    rect.width = newWidth;
  }
  if (session.mode.includes('s')) {
    rect.height = Math.max(MIN_SIZE, session.startRect.height + dy);
  }
  if (session.mode.includes('n')) {
    const newHeight = Math.max(MIN_SIZE, session.startRect.height - dy);
    rect.y = session.startRect.y + (session.startRect.height - newHeight);
    rect.height = newHeight;
  }

  if (ctx.gridEnabled) {
    rect.width = Math.max(MIN_SIZE, snapSize(rect.width));
    rect.height = Math.max(MIN_SIZE, snapSize(rect.height));
  }

  return { rect, guides: [] };
}

function snapSize(value: number, gridSize = 8): number {
  return Math.round(value / gridSize) * gridSize;
}
