# CLAUDE.md — SCMDesigner 開発ガイド

## プロジェクト概要

SceneCustomMenu.js（トリアコンタン氏製・1.53.4）のカスタムメニューパラメータを、RPGツクールMZ の**テストプレイ中にドラッグ&ドロップと選択式UIで視覚的に編集**し、`js/plugins.js` に書き戻す開発専用プラグイン。自分専用の内製ツール。

**仕様の正は SPEC.md**。本ファイルは開発時のルールと環境知識をまとめる。矛盾があれば SPEC.md を優先し、SPEC.md の更新を提案すること。

## 技術スタック

- TypeScript（strict）
- esbuild → `dist/SCMDesigner.js`（IIFE・単一ファイル）
- zod（スキーマ検証。依存ライブラリはこれのみ）
- vitest（ゲーム非依存の model / bridge 純関数のみ対象）
- 実行環境: RPGツクールMZ の NW.js テストプレイ（Chromium + Node 統合環境）

## コマンド

```bash
npm run build      # esbuild で dist/SCMDesigner.js を生成
npm run watch      # 監視ビルド
npm run test       # vitest（mzformat / validate / placement）
npm run deploy     # dist を MZ プロジェクトの js/plugins/ へコピー
```

- デプロイ先パスは `scmd.local.json`（gitignore 対象）で指定する
- プラグインヘッダ（`/*:ja ... */`）は esbuild の banner で `main.ts` から管理する

## ディレクトリ構成

```
src/main.ts        エントリ。活性化判定・起動キー・モード管理
src/model/         型定義（types）、zod スキーマ（schema）、MZ形式変換（mzformat）、検証（validate）
src/bridge/        plugins.js 読み書き（pluginsFile）、パス解決（projectPath）、ライブ反映（liveApply）
src/editor/        編集状態（state）、Undo/Redo（history）、テンプレ（templates）、プリセット（presets）
src/gizmo/         PIXI 編集レイヤー（overlay / drag / snap）
src/ui/            DOM オーバーレイ（panel / tree / contentEditor / styles）
test/              vitest + fixtures（実 plugins.js の抜粋）
```

## 開発の進め方（重要）

- **plan-first**: コードを書く前に必ず実装計画（変更ファイル・追加する関数・確認手順）を提示し、承認を得てから実装する
- フェーズは SPEC.md §9 の Phase 0 → 5 を厳守。**フェーズをまたぐ先行実装をしない**
- 各フェーズの完了条件を満たしたことを確認してから次へ進む
- 仕様の穴や矛盾を見つけたら、実装で勝手に解決せず、まず SPEC.md の更新を提案する
- Phase 0 の PoC 結果（入力遮断方式・シーン再生成方式・バイト互換の可否）は SPEC.md に反映してから Phase 1 に入る

## 絶対に守るルール

1. **plugins.js への書き込みは、必ず「バックアップ → 一時ファイル → rename」の経路を通す**。直接上書きするコードを書かない
2. **非破壊原則**: parse できないキー・未知のキーは解釈せず保持し、そのまま書き戻す。勝手な削除・正規化・整形をしない
3. SceneCustomMenu.js 本体・PluginCommonBase は**改変しない**（フックはすべて SCMDesigner 側から当てる）
4. ユーザーのスクリプト文字列（ListScript / ItemDrawScript / Event.Script 等）を**自動書き換えしない**。プリセット一致判定に失敗したら「カスタム」として値をそのまま保持する
5. `model/` と `mzformat` 系はゲームグローバル（`$game〜`, `SceneManager`, `PIXI` 等）に依存させない（Node 単体テスト可能性の維持）
6. 配布ビルドで動かないこと: すべての初期化は `Utils.isOptionValid('test') && Utils.isNwjs()` ガードの内側で行う

## MZ / SceneCustomMenu 固有の注意

- **パラメータ値はすべて文字列**。struct は「JSON 文字列の入れ子」で、serialize は子から親への再帰 `JSON.stringify`
- 配置は `Scene_CustomMenu.setPlacement` 依存:
  - 絶対配置の y には `mainAreaTop()` が加算される
  - `RelativeWindowIdX` = 親の**右端**基準、`RelativeWindowIdY` = 親の**下端**基準（この場合 `mainAreaTop` 加算なし）
  - `originX`（中央 / 右）は相対解決の**後**に適用される
  - 逆変換式は SPEC.md §6.2 を必ず参照
- `width = 0` は「画面右端までフィル」、`height = 0` は「行数から自動」。**0 は auto の意味**を持つため、UI で実数値 0 と混同しない
- `RelativeWindowIdX/Y` と `ListWindowId` は **WindowList の定義順**で解決される。前方参照は不可（バリデーション対象）
- グローバル公開済み API: `window.Scene_CustomMenu`, `Window_CustomMenu(Command/DataList)`, `SceneManager.findSceneData / callCustomMenu / findCustomMenuWindow / isCustomScene`
- シーン内のウィンドウ実体は `scene._customWindowMap`（`Map<Id, Window>`）
- パラメータは起動時に `PluginManagerEx.createParameter` で**一度だけ** parse される → ライブ反映は `SceneManager.findSceneData` のフックで編集中モデルを注入する
- スクリプト系パラメータは実行時 `eval` で評価され、`v(n)` / `s(n)` / `item` / `r` / `this`（ウィンドウ）が暗黙に使える。プリセット生成時はこの規約に従う

## コーディング規約

- TypeScript strict。`any` 禁止（`unknown` + zod で絞る）
- UI は素の DOM。小さな生成関数（`createXxxPanel(state): HTMLElement`）の集合で構成し、状態は `editor/state` に集約
- gizmo は `PIXI.Graphics` / `Container`。編集モード中のみ存在するため、性能より単純さ優先（毎フレーム全再描画で可）
- ファイル間の依存方向: `ui / gizmo → editor → model`、`bridge → model`。逆流禁止
- コメント・UI 文言は日本語で統一

## テスト

- vitest 対象: `mzformat`（ラウンドトリップ。fixtures に実 plugins.js 抜粋と SceneCustomMenu デフォルト値を置く）、`validate`、配置逆変換の純関数
- ゲーム内動作は各フェーズの完了条件で手動確認する。実装完了報告には**手動確認手順**を必ず添える

## フェーズキックオフの型

```
SPEC.md と CLAUDE.md を読んでください。
今回は Phase N「◯◯」を実装します。
まず実装計画（変更ファイル、追加する関数、手動確認手順）を提示してください。
コードはまだ書かないでください。
```
