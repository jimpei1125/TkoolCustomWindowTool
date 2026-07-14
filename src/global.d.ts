// RPGツクールMZ / NW.js ランタイムのグローバルに対する最小限のアンビエント宣言。
// SCMDesigner はこれらのグローバルを改変せず、フック（メソッド差し替え）のみ行う
// （CLAUDE.md「絶対に守るルール」3）。型はここで使用する範囲のみ宣言する。

declare const Utils: {
  isOptionValid(name: string): boolean;
  isNwjs(): boolean;
};

declare const PluginManagerEx: {
  createParameter(script: Document | HTMLScriptElement | null): Record<string, unknown>;
};

declare const Input: {
  update(): void;
};

declare const TouchInput: {
  update(): void;
};

declare const SceneManager: {
  _scene: unknown;
};
