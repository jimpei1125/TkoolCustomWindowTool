import { describe, expect, it } from 'vitest';
import { computeActualPlacement, computeStoredPlacement, type PlacementContext } from '../src/model/placement';

describe('placement 逆変換 (SPEC.md §6.2)', () => {
  it('絶対配置: y に mainAreaTop が加算される', () => {
    const ctx: PlacementContext = { originX: 0, width: 240, mainAreaTop: 96 };
    const stored = computeStoredPlacement({ x: 100, y: 196 }, ctx);
    expect(stored).toEqual({ x: 100, y: 100 });

    const actual = computeActualPlacement(stored, ctx);
    expect(actual).toEqual({ x: 100, y: 196 });
  });

  it('RelativeWindowIdX: 親の右端基準で x を逆算する', () => {
    const parent = { x: 0, y: 0, width: 240, height: 100 };
    const ctx: PlacementContext = { originX: 0, width: 200, mainAreaTop: 96, relativeParentX: parent };
    const stored = computeStoredPlacement({ x: 260, y: 96 }, ctx);
    // actualX(260) - (parent.x(0) + parent.width(240)) = 20
    expect(stored.x).toBe(20);

    const actual = computeActualPlacement(stored, ctx);
    expect(actual.x).toBe(260);
  });

  it('RelativeWindowIdY: 親の下端基準で y を逆算し、mainAreaTop は加算しない', () => {
    const parent = { x: 0, y: 96, width: 240, height: 100 };
    const ctx: PlacementContext = { originX: 0, width: 200, mainAreaTop: 96, relativeParentY: parent };
    const stored = computeStoredPlacement({ x: 0, y: 216 }, ctx);
    // actualY(216) - (parent.y(96) + parent.height(100)) = 20
    expect(stored.y).toBe(20);

    const actual = computeActualPlacement(stored, ctx);
    expect(actual.y).toBe(216);
  });

  it('originX=1（中央）: 相対解決の後に + floor(width/2) される', () => {
    const ctx: PlacementContext = { originX: 1, width: 241, mainAreaTop: 0 };
    const stored = computeStoredPlacement({ x: 100, y: 0 }, ctx);
    // floor(241/2) = 120
    expect(stored.x).toBe(220);

    const actual = computeActualPlacement(stored, ctx);
    expect(actual.x).toBe(100);
  });

  it('originX=2（右）: 相対解決の後に + width される', () => {
    const ctx: PlacementContext = { originX: 2, width: 150, mainAreaTop: 0 };
    const stored = computeStoredPlacement({ x: 100, y: 0 }, ctx);
    expect(stored.x).toBe(250);

    const actual = computeActualPlacement(stored, ctx);
    expect(actual.x).toBe(100);
  });

  it('相対配置 + originX=中央 を組み合わせてもラウンドトリップする', () => {
    const parent = { x: 10, y: 20, width: 300, height: 80 };
    const ctx: PlacementContext = {
      originX: 1,
      width: 121,
      mainAreaTop: 96,
      relativeParentX: parent,
      relativeParentY: parent,
    };
    const original = { x: 400, y: 150 };
    const stored = computeStoredPlacement(original, ctx);
    const roundTripped = computeActualPlacement(stored, ctx);
    expect(roundTripped).toEqual(original);
  });
});
