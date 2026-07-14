import { describe, expect, it } from 'vitest';
import { beginDrag, updateDrag } from '../src/gizmo/drag';
import type { SnapContext } from '../src/gizmo/snap';

const ctx: SnapContext = {
  otherRects: [],
  screenWidth: 816,
  screenHeight: 624,
  mainAreaTop: 0,
  gridEnabled: false,
};

describe('drag move/resize', () => {
  it('move: ポインタの移動量だけ矩形が平行移動する', () => {
    const session = beginDrag('win1', 'move', { x: 100, y: 100 }, { x: 10, y: 20, width: 200, height: 100 });
    const { rect } = updateDrag(session, { x: 130, y: 90 }, ctx);
    expect(rect).toEqual({ x: 40, y: 10, width: 200, height: 100 });
  });

  it('resize-se: 右下ハンドルは幅・高さのみ変える', () => {
    const session = beginDrag('win1', 'resize-se', { x: 100, y: 100 }, { x: 10, y: 20, width: 200, height: 100 });
    const { rect } = updateDrag(session, { x: 150, y: 130 }, ctx);
    expect(rect).toEqual({ x: 10, y: 20, width: 250, height: 130 });
  });

  it('resize-nw: 左上ハンドルはx/yと幅/高さを連動して変える', () => {
    const session = beginDrag('win1', 'resize-nw', { x: 100, y: 100 }, { x: 10, y: 20, width: 200, height: 100 });
    const { rect } = updateDrag(session, { x: 80, y: 110 }, ctx);
    // dx=-20 -> width 220, x = 10 + (200-220) = -10
    // dy=10 -> height 90, y = 20 + (100-90) = 30
    expect(rect).toEqual({ x: -10, y: 30, width: 220, height: 90 });
  });

  it('resize: 最小サイズ(24)を下回らない', () => {
    const session = beginDrag('win1', 'resize-e', { x: 100, y: 100 }, { x: 10, y: 20, width: 30, height: 100 });
    const { rect } = updateDrag(session, { x: 50, y: 100 }, ctx);
    expect(rect.width).toBeGreaterThanOrEqual(24);
    const shrink = updateDrag(session, { x: -1000, y: 100 }, ctx);
    expect(shrink.rect.width).toBe(24);
  });
});
