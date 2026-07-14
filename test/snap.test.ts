import { describe, expect, it } from 'vitest';
import { computeSnap, snapToGrid, type SnapContext } from '../src/gizmo/snap';

describe('snapToGrid', () => {
  it('8pxグリッドに丸める', () => {
    expect(snapToGrid(5)).toBe(8);
    expect(snapToGrid(3)).toBe(0);
    expect(snapToGrid(12)).toBe(16);
    expect(snapToGrid(20)).toBe(24);
  });
});

describe('computeSnap', () => {
  const baseCtx: SnapContext = {
    otherRects: [],
    screenWidth: 816,
    screenHeight: 624,
    mainAreaTop: 96,
    gridEnabled: true,
  };

  it('グリッド有効時は近傍の8pxグリッドに吸着する', () => {
    const result = computeSnap({ x: 101, y: 202, width: 100, height: 50 }, baseCtx);
    expect(result.x).toBe(104);
    expect(result.y).toBe(200);
  });

  it('画面端(0)やmainAreaTopに近い場合はそちらへ優先吸着し、ガイド線が出る', () => {
    const result = computeSnap({ x: 2, y: 98, width: 100, height: 50 }, baseCtx);
    expect(result.x).toBe(0);
    expect(result.y).toBe(96);
    expect(result.guides).toContainEqual({ orientation: 'vertical', position: 0 });
    expect(result.guides).toContainEqual({ orientation: 'horizontal', position: 96 });
  });

  it('他ウィンドウの右端/下端に近い場合は吸着する', () => {
    const ctx: SnapContext = {
      ...baseCtx,
      otherRects: [{ id: 'win1', x: 0, y: 96, width: 240, height: 100 }],
    };
    // 240 + 3 = 243 は右端(240)に吸着距離3で、グリッド吸着(244, 距離1)より近いかどうかを見る
    const result = computeSnap({ x: 241, y: 197, width: 100, height: 50 }, ctx);
    expect(result.x).toBe(240);
    expect(result.y).toBe(196);
  });

  it('吸着候補が閾値より遠い場合はそのままの値を保つ（グリッド無効時）', () => {
    const ctx: SnapContext = { ...baseCtx, gridEnabled: false };
    const result = computeSnap({ x: 123, y: 321, width: 100, height: 50 }, ctx);
    expect(result.x).toBe(123);
    expect(result.y).toBe(321);
    expect(result.guides).toEqual([]);
  });
});
