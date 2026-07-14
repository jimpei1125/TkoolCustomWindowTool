// Scene_CustomMenu.setPlacement の配置解決／逆変換（SPEC.md §6.2）の純関数実装。
//
// 実装ノート: この計算式は SPEC.md §6.2 の表を直接コード化したものであり、
// SceneCustomMenu.js 本体のソースを参照して導出したものではない
// （本ツールは SceneCustomMenu.js を改変しないため、実際の setPlacement の
// 挙動と一致するかは Phase 0 完了条件3「実座標 → 保存値 → 再起動 → 同位置」
// の実機確認で必ず検証すること）。
//
// - x の原点調整（originX）は相対解決の後に適用される
// - RelativeWindowIdY を使う場合、y には mainAreaTop() が加算されない

export interface ResolvedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OriginX = 0 | 1 | 2;

export interface PlacementContext {
  /** 幅方向の原点基準（0: 左, 1: 中央, 2: 右） */
  originX: OriginX;
  /** 自身の実幅（原点オフセット計算に使用。auto (0) は解決済みの実数値であること） */
  width: number;
  /** RelativeWindowIdX が指す先のウィンドウの実座標（未指定なら absolute） */
  relativeParentX?: ResolvedRect;
  /** RelativeWindowIdY が指す先のウィンドウの実座標（未指定なら absolute） */
  relativeParentY?: ResolvedRect;
  /** Scene_MenuBase.mainAreaTop() 相当の値 */
  mainAreaTop: number;
}

function originOffset(originX: OriginX, width: number): number {
  if (originX === 1) return Math.floor(width / 2);
  if (originX === 2) return width;
  return 0;
}

/**
 * 実座標（`_customWindowMap` から取得した確定座標）から、plugins.js に書き戻す
 * 保存値（x, y）を逆算する（SPEC.md §6.2「書き戻し」）。
 */
export function computeStoredPlacement(
  actual: { x: number; y: number },
  ctx: PlacementContext
): { x: number; y: number } {
  const baseX = ctx.relativeParentX
    ? actual.x - (ctx.relativeParentX.x + ctx.relativeParentX.width)
    : actual.x;
  const x = baseX + originOffset(ctx.originX, ctx.width);

  const y = ctx.relativeParentY
    ? actual.y - (ctx.relativeParentY.y + ctx.relativeParentY.height)
    : actual.y - ctx.mainAreaTop;

  return { x, y };
}

/**
 * 保存値（x, y）から実座標を計算する（SPEC.md §6.2「読み取り」相当、
 * setPlacement の順変換）。computeStoredPlacement のラウンドトリップ検証、
 * および将来のライブプレビュー計算に使う。
 */
export function computeActualPlacement(
  stored: { x: number; y: number },
  ctx: PlacementContext
): { x: number; y: number } {
  const relBaseX = ctx.relativeParentX
    ? ctx.relativeParentX.x + ctx.relativeParentX.width
    : 0;
  const x = relBaseX + stored.x - originOffset(ctx.originX, ctx.width);

  const y = ctx.relativeParentY
    ? ctx.relativeParentY.y + ctx.relativeParentY.height + stored.y
    : stored.y + ctx.mainAreaTop;

  return { x, y };
}
