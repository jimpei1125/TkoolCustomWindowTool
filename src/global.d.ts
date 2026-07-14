// RPGツクールMZ / NW.js ランタイムのグローバルに対する最小限のアンビエント宣言。
// SCMDesigner はこれらのグローバルを改変せず、フック（メソッド差し替え）のみ行う
// （CLAUDE.md「絶対に守るルール」3）。型はここで使用する範囲のみ宣言する。

declare const Utils: {
  isOptionValid(name: string): boolean;
  isNwjs(): boolean;
};

declare const PluginManagerEx: {
  createParameter(script: Document | HTMLScriptElement | null): Record<string, unknown>;
  /** オブジェクトのコンストラクタ名を返す（PluginCommonBase提供のユーティリティ）。 */
  findClassName(obj: unknown): string;
};

declare const Input: {
  update(): void;
};

declare const TouchInput: {
  update(): void;
};

declare const SceneManager: {
  _scene: unknown;
  /**
   * 引数必須: 現在のシーンが指定した識別子のカスタムシーンかどうかを返す
   * （SceneCustomMenu.js実装: `this._scene.constructor === this._customScene[id]`）。
   * 引数なしで呼ぶと常に false になるため注意。
   */
  isCustomScene(id: string): boolean;
};

/** SceneCustomMenu.js が window に公開する、カスタムメニューシーンの基底クラス。 */
declare class Scene_CustomMenu {}

// rmmz_core.js の Graphics（解像度取得・キャンバス座標変換のみ使用）。
declare const Graphics: {
  width: number;
  height: number;
  pageToCanvasX(x: number): number;
  pageToCanvasY(y: number): number;
};

// PIXI（RPGツクールMZ にバンドルされる PixiJS v5 相当）の必要最小限の型。
// 実際の型定義全体は持ち込まず、本ツールが使う API のみを宣言する。
interface PixiDisplayObject {
  x: number;
  y: number;
  visible: boolean;
  addChild(child: PixiDisplayObject): void;
  removeChild(child: PixiDisplayObject): void;
  destroy(options?: unknown): void;
}

interface PixiGraphics extends PixiDisplayObject {
  clear(): PixiGraphics;
  lineStyle(width: number, color: number, alpha?: number): PixiGraphics;
  beginFill(color: number, alpha?: number): PixiGraphics;
  endFill(): PixiGraphics;
  drawRect(x: number, y: number, width: number, height: number): PixiGraphics;
  moveTo(x: number, y: number): PixiGraphics;
  lineTo(x: number, y: number): PixiGraphics;
}

interface PixiText extends PixiDisplayObject {
  text: string;
}

declare const PIXI: {
  Container: new () => PixiDisplayObject;
  Graphics: new () => PixiGraphics;
  Text: new (text: string, style?: Record<string, unknown>) => PixiText;
};
