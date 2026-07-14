// グリッド / 端吸着・ガイド線の計算（SPEC.md §6.3、純関数）。
// ゲームグローバルに依存しない。

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideLine {
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface SnapContext {
  /** 吸着候補となる他ウィンドウの実矩形（ドラッグ対象自身は含めない） */
  otherRects: ReadonlyArray<Rect & { id: string }>;
  screenWidth: number;
  screenHeight: number;
  mainAreaTop: number;
  gridEnabled: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: GuideLine[];
}

export const GRID_SIZE = 8;
export const SNAP_THRESHOLD = 6;

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

function pickBest(value: number, candidates: number[], gridEnabled: boolean): number {
  let best = gridEnabled ? snapToGrid(value) : value;
  let bestDistance = gridEnabled ? Math.abs(best - value) : Infinity;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= SNAP_THRESHOLD && distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/** ドラッグ中の矩形位置を、グリッド・他ウィンドウ端/中心・画面端・mainAreaTop に吸着させる。 */
export function computeSnap(rect: Rect, ctx: SnapContext): SnapResult {
  const candidatesX: number[] = [0, ctx.screenWidth - rect.width];
  const candidatesY: number[] = [0, ctx.mainAreaTop, ctx.screenHeight - rect.height];

  for (const other of ctx.otherRects) {
    candidatesX.push(
      other.x,
      other.x + other.width,
      other.x + other.width - rect.width,
      other.x + Math.round(other.width / 2) - Math.round(rect.width / 2)
    );
    candidatesY.push(
      other.y,
      other.y + other.height,
      other.y + other.height - rect.height,
      other.y + Math.round(other.height / 2) - Math.round(rect.height / 2)
    );
  }

  const x = pickBest(rect.x, candidatesX, ctx.gridEnabled);
  const y = pickBest(rect.y, candidatesY, ctx.gridEnabled);

  const guides: GuideLine[] = [];
  if (x !== rect.x) guides.push({ orientation: 'vertical', position: x });
  if (y !== rect.y) guides.push({ orientation: 'horizontal', position: y });

  return { x, y, guides };
}
