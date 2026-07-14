# SCMDesigner — SceneCustomMenu ビジュアルエディタ SPEC

## 1. 概要

SCMDesigner は、トリアコンタン氏の SceneCustomMenu.js（カスタムメニュー作成プラグイン）のパラメータを、**テストプレイ中の実画面上でドラッグ&ドロップ・選択式UIによって視覚的に編集**し、`js/plugins.js` へ書き戻す**開発専用の RPGツクールMZ プラグイン**である。

- ランタイム機能は一切持たない。実行時の描画・シーン遷移・イベント処理はすべて SceneCustomMenu.js に委譲する
- 本ツールは「plugins.js 内の SceneCustomMenu パラメータのビジュアルエディタ」に徹する
- **自分専用の内製ツール**。日本語UIのみ、自環境（Windows / NW.js）のみサポート

### 解決する課題

MZ プラグイン管理画面での編集は、深い入れ子構造・座標の手打ち・プレビュー不能により試行錯誤コストが非常に高い。本ツールはこれを「実画面上での直接操作」に置き換える。ゲーム内で動かすため、ウィンドウスキン・制御文字・フォント・実データ（`$gameParty` 等）が**見たまま＝本番**で編集できる。

## 2. 前提環境

| 項目 | 内容 |
|---|---|
| エンジン | RPGツクールMZ（Windows） |
| 活性化条件 | NW.js テストプレイ時のみ: `Utils.isOptionValid('test') && Utils.isNwjs()` |
| 依存プラグイン | PluginCommonBase、SceneCustomMenu.js **1.53.4 に固定** |
| プラグイン順 | PluginCommonBase → SceneCustomMenu → **SCMDesigner** |
| 配布 | 配布ビルドでは非活性（判定で無効化）。デプロイ前にプラグイン自体を外してもよい |

## 3. スコープ

### In scope

- SceneCustomMenu の Scene1〜20 パラメータの読み込み・GUI 編集・保存
- ウィンドウの移動 / リサイズ（グリッド・吸着・相対アンカー）
- テンプレートからのウィンドウ追加、削除、複製、順序変更、ID リネーム
- 中身の選択式編集（一覧取得プリセット、描画ブロック、コマンドリスト）
- イベント（決定 / キャンセル / カーソル）の選択式編集
- plugins.js へのバックアップ付き保存、編集内容のライブ反映
- Undo / Redo

### Out of scope（やらない）

- ランタイム機能の追加、SceneCustomMenu の挙動変更
- マップ HUD 等、SceneCustomMenu の枠外のウィンドウ
- 他プラグインのパラメータ編集
- 制御文字のリッチテキスト編集（生テキスト入力 + 実画面プレビューで代替）
- ブラウザテスト対応、多言語対応、公開品質の堅牢化
- タッチ / スマホ対応（マウス + キーボード前提）

## 4. アーキテクチャ

### 4.1 全体像

TypeScript で実装し、esbuild で**単一プラグインファイル `SCMDesigner.js`（IIFE）**にバンドルする。3層構成:

1. **model / bridge 層**（ゲーム非依存 + fs）: パラメータの型・変換・plugins.js 入出力。**Node 単体でユニットテスト可能**にする
2. **gizmo 層**（PIXI）: シーン最前面の編集用レイヤー。選択枠・リサイズハンドル・ガイド線・グリッド
3. **ui 層**（DOM オーバーレイ）: NW.js = Chromium 上で `document.body` に重ねる HTML パネル。フレームワーク不使用（素の TS + DOM）

### 4.2 ディレクトリ構成

```
scm-designer/
├── src/
│   ├── main.ts              # エントリ。活性化判定、起動キー、モード管理、プラグインヘッダ
│   ├── model/
│   │   ├── types.ts         # SceneData / WindowData / CommandData / EventData 等の TS 型
│   │   ├── schema.ts        # zod スキーマ（.passthrough() で未知キー保持）
│   │   ├── mzformat.ts      # MZ パラメータ文字列 ⇔ モデルの parse / serialize
│   │   └── validate.ts      # ID 重複・参照順・循環等のバリデーション
│   ├── bridge/
│   │   ├── projectPath.ts   # プロジェクトルート / plugins.js / バックアップ先の解決
│   │   ├── pluginsFile.ts   # plugins.js の読み書き・バックアップ・mtime 監視
│   │   └── liveApply.ts     # findSceneData フック、シーン再生成によるライブ反映
│   ├── editor/
│   │   ├── state.ts         # 編集セッション状態（現在シーン、選択、dirty フラグ）
│   │   ├── history.ts       # Undo / Redo（モデルスナップショット方式）
│   │   ├── templates.ts     # ウィンドウテンプレート定義
│   │   └── presets.ts       # ListScript / ItemDrawScript 等のプリセット定義
│   ├── gizmo/
│   │   ├── overlay.ts       # PIXI レイヤー管理、選択枠 / ハンドル / ラベル描画
│   │   ├── drag.ts          # 移動 / リサイズのドラッグ処理
│   │   └── snap.ts          # グリッド / 端吸着 / ガイド線の計算
│   └── ui/
│       ├── panel.ts         # 右ドック（3タブ + 詳細アコーディオン）
│       ├── tree.ts          # ウィンドウ一覧ツリー（順序変更 / 複製 / 削除 / リネーム）
│       ├── contentEditor.ts # 中身タブ（一覧 / 描画ブロック / コマンドリスト）
│       └── styles.ts        # オーバーレイ用 CSS（JS 内埋め込み）
├── test/
│   ├── mzformat.test.ts     # ラウンドトリップテスト
│   ├── placement.test.ts    # 配置の逆変換テスト（純関数部分）
│   └── fixtures/            # 実 plugins.js の抜粋、プラグインデフォルト値
├── scripts/
│   ├── build.mjs            # esbuild 設定（banner にプラグインヘッダ）
│   └── deploy.mjs           # dist を MZ プロジェクトの js/plugins/ へコピー
├── dist/SCMDesigner.js
├── SPEC.md
└── CLAUDE.md
```

## 5. データモデル

### 5.1 型定義（SceneCustomMenu 1.53.4 の struct をそのまま写像）

**SceneData**: `Id`, `UseHelp`(0/1/2), `HelpRows`, `InitialEvent`, `ParallelEventId`, `ActorChangeEvent`, `WindowList[]`, `PicturePriority`(0/1/2), `Panorama`, `UsePageButtons`, `SnapNoFilter`

**WindowData**（カテゴリ別）:

| カテゴリ | フィールド |
|---|---|
| 識別 | `Id` |
| 配置 | `x`, `y`, `RelativeWindowIdX`, `RelativeWindowIdY`, `width`, `height`, `originX`(0/1/2), `Rotation` |
| レイアウト | `ColumnNumber`, `RowNumber`, `ItemHeight` |
| 中身 | `CommandList[]`, `ListWindowId`, `ListScript`, `FilterScript`, `MappingScript`, `SortScript`, `ItemDrawScript[]`, `ItemDrawMultiLineScript`, `IsEnableScript` |
| イベント | `DecisionEvent`, `CancelEvent`, `CursorEvent`, `ButtonEvent[]`, `Cancelable`, `PopCancel` |
| 表示 | `WindowSkin`, `FontSize`, `FontFace`, `textColor`, `VisibleSwitchId`, `ShowOpenAnimation`, `OverlapOther`, `HiddenNoFocus`, `DarkNoFocus`, `noFrame`, `noItemBackground`, `cursorOverContents` |
| その他 | `CommonHelpText`, `MaskingText`, `RefreshSwitchId`, `IndexVariableId`, `RememberIndex`, `ItemVariableId`, `ActorChangeable`, `okSound`, `cursorAllSwitchId`, `cursorFixedSwitchId` |

**CommandData**: `Text`, `Align`(0/1/2), `VisibleSwitchId`, `VisibleScript`, `EnableSwitchId`, `IsEnableScript`, `HelpText`, `DecisionEvent`, `CancelChoice`, `OkSound`

**EventData**: `CommandId`(コモンイベント), `FocusWindowId`, `FocusWindowIndex`, `Script`, `SwitchId`, `Deselect`

**ButtonEventData**: `Name`, `Event` ／ **PanoramaData**: `Image`, `ScrollX`, `ScrollY` ／ **AudioSeData**: `name`, `volume`, `pitch`, `pan`

### 5.2 MZ パラメータ形式（mzformat.ts）— 本ツールの心臓部

- plugins.js の `parameters` は**すべて文字列**。struct は「JSON 文字列の入れ子」（子 struct / 配列は `JSON.stringify` 済み文字列として親に格納される）
- **parse**: 再帰的 `JSON.parse`（`PluginManagerEx.createParameter` 相当）→ zod で型付け。数値 / 真偽値は内部では正しい型に変換
- **serialize**: 逆順の再帰 `JSON.stringify`。値はすべて文字列に戻す。**MZ エディタの出力とバイト互換**を目指す（Phase 0 で検証）
- **非破壊原則**: 未知のキーは解釈せず保持し、そのまま書き戻す（zod `.passthrough()` + extra フィールド）。空 struct `{}` / 空文字の区別も維持する

### 5.3 バリデーション（validate.ts）

- `Id` の重複禁止（シーン間・同一シーンのウィンドウ間）
- `RelativeWindowIdX/Y`・`ListWindowId` は **WindowList 内で自分より前**のウィンドウのみ参照可（SceneCustomMenu が定義順に解決するため）。前方参照・循環はエラー
- `FocusWindowId` の同一シーン内存在チェック
- ID リネーム時: `RelativeWindowIdX/Y`, `ListWindowId`, `FocusWindowId` は自動追従。**スクリプト文字列内の参照**（`findWindowItem('id')`, `changeWindowFocus('id')` 等）は自動書き換えせず、検出して警告一覧に表示する

## 6. 配置モデル（最重要仕様）

### 6.1 読み取り

編集対象シーン表示中、`SceneManager._scene._customWindowMap` から**実インスタンスの確定座標**（`setPlacement` 適用後）を取得する。エディタ側で配置ロジックを再実装しない。

### 6.2 書き戻し（`setPlacement` の逆変換）

| アンカー設定 | 保存値の計算 |
|---|---|
| 絶対（Relative 未指定） | `x = 実x`、`y = 実y - mainAreaTop()` |
| `RelativeWindowIdX = P` | `x = 実x - (P.x + P.width)` |
| `RelativeWindowIdY = Q` | `y = 実y - (Q.y + Q.height)`（`mainAreaTop` 加算なし） |
| `originX = 1`（中央） | 上記 x に `+ floor(width / 2)` |
| `originX = 2`（右） | 上記 x に `+ width` |

- `width = 0` は「x から画面右端までフィル」、`height = 0` は「行数から自動算出」。UI 上は **auto トグル**として表現し、手動リサイズした時点で実数値に固定（トグルで auto に戻せる）
- `Rotation` は gizmo 編集対象外（詳細アコーディオンの数値入力のみ）

### 6.3 吸着とアンカーの自動提案

- ドラッグ中: 8px グリッド（Shift で一時無効）、他ウィンドウの端 / 中心・画面端・mainArea 上端への吸着 + ガイド線表示
- 他ウィンドウの**右端**または**下端**に吸着してドロップした場合、「P の右に接続（RelativeWindowIdX）／ Q の下に接続（RelativeWindowIdY）／ 絶対配置」をその場の小ポップアップで選択。既定は現在のアンカー設定を維持

## 7. UI / UX 仕様

### 7.1 起動と終了

- テストプレイ中 **F9** でエディタ ON / OFF（キーは config で変更可）
- カスタムシーン表示中に起動 → そのシーンを直接編集
- それ以外の画面で起動 → シーン一覧パネル → 選択で `SceneManager.callCustomMenu(id)` して編集開始
- 編集モード中はゲーム入力を遮断する。方式は Phase 0 で確定（候補: 編集フラグ中 `Input.update` / `TouchInput.update` を早期 return + 全ウィンドウ deactivate）

### 7.2 画面構成

- **左上ツールバー**: シーン切替 / 保存 / 破棄 / Undo / Redo / グリッド切替
- **右ドック**: ウィンドウツリー + プロパティパネル（3タブ: 配置 / 中身 / 動作）
- **中央**: ゲーム実画面 + gizmo（選択枠、8方向ハンドル、Id ラベル、ガイド線）
- **下部バー**: バリデーション警告、未保存マーク、plugins.js の状態（外部変更検出）

### 7.3 プロパティパネル

**配置タブ**: x / y / width / height（auto 対応）、アンカー（絶対 / ◯◯の右 / ◯◯の下）、originX、列数、行数、項目高さ

**中身タブ**: まずモードを選択 →
- **コマンドリスト**: 行の追加 / 削除 / 並べ替え。各行はテキスト・揃え・ヘルプ・表示 / 選択可否（スイッチ or スクリプトプリセット）・キャンセル選択肢・決定SE
- **データ一覧**: 一覧取得ドロップダウン（`ListScript` プリセット全種 ≈ 38 を流用）。フィルタ / ソート / マッピングは折りたたみでプリセット選択
- **一覧連動詳細**: 参照ウィンドウのドロップダウン（`ListWindowId`）
- **単項目表示**: `ListScript = null` プリセット
- **描画ブロック**: `ItemDrawScript` をブロックのリストとして表示。パレット（アイコン / 顔グラ / キャラ / アクター名 / 職業 / レベル / ステータス / ゲージ / アイテム名 / 所持数 / 任意テキスト / メモ欄 / セーブ情報 …≈ 30 種）から追加、並べ替え、削除。任意テキストは入力欄 + 制御文字ヒント

**動作タブ**: 決定 / キャンセル / カーソルイベント（フォーカス先ウィンドウのドロップダウン、別シーン呼び出し、前の画面に戻る、スイッチ ON、コモンイベント、選択解除）、キャンセル可能、共通ヘルプ、表示スイッチ、フォントサイズ、ウィンドウスキン（`img/system` のファイル一覧から選択）

**詳細アコーディオン**（末尾共通）: Rotation, OverlapOther, MaskingText, okSound, RememberIndex, IndexVariableId, ItemVariableId, cursor 系スイッチ, noFrame, noItemBackground, textColor, FontFace, DarkNoFocus, HiddenNoFocus, ShowOpenAnimation, RefreshSwitchId, PopCancel, ButtonEvent 等の残り全項目（素の入力 UI で網羅）

### 7.4 エスケープハッチ

すべてのスクリプト系項目に「直接編集」欄を用意する。プリセットに一致しない値は**カスタム**バッジを表示し、値をそのまま保持する（壊さない）。

### 7.5 ウィンドウテンプレート（初期セット）

| 名前 | 内容 |
|---|---|
| はい / いいえ | CommandList 2件、「いいえ」= CancelChoice |
| 縦コマンド | CommandList 3件のひな形 |
| パーティ一覧 | `$gameParty.members()` + `drawActorSimpleStatus` |
| アイテム一覧 | `$gameParty.items()`、ヘルプ連動 |
| 一覧連動詳細 | `ListWindowId` = 選択中の一覧 + 顔グラ描画 |
| セーブ / ロード | `createSaveFiles()` + `drawSavefileInfo` + `executeSave / executeLoad` |
| 所持金 | 単項目 + `drawText($gameParty.gold())` |
| フリーテキスト | 単項目 + `drawTextEx` |

## 8. 保存・ライブ反映

### 8.1 ライブ反映（保存とは独立）

- `SceneManager.findSceneData` をフックし、編集セッション中は**編集中モデル**を返す
- 反映操作で対象シーンを再生成する。方式は Phase 0 で確定（候補: `SceneManager.pop()` → `callCustomMenu(id)`、または `goto(createCustomMenuClass(id))`。`push` によるスタック多重化に注意）
- ドラッグ中は gizmo と実ウィンドウの x / y / width / height を直接動かしてプレビューし、ドロップ確定時にモデルへ反映する

### 8.2 plugins.js への保存

1. `<project>/js/plugins.js` を読み、`var $plugins = [...]` の JSON 部を抽出して parse
2. `name === 'SceneCustomMenu'` のエントリの `parameters` **のみ**差し替える（他プラグインには一切触れない）
3. `<project>/scmd_backup/plugins_YYYYMMDD-HHMMSS.js` にバックアップ（最新 20 件保持、超過分は古い順に削除）
4. 一時ファイルに書き出し → rename で置換（原子的書き込み）
5. 整形は MZ エディタ互換（1 プラグイン 1 行）にして diff ノイズを抑える

### 8.3 競合対策

- 起動時に plugins.js の mtime を記録。保存時に外部変更を検出したら**保存を中止して警告**（再読込を促す）
- 運用ルール: **MZ エディタのプラグイン管理画面を閉じてから使う**。MZ エディタ側への反映はプロジェクトを開き直したとき

### 8.4 エディタ設定の永続化

`<project>/scmd.config.json`（起動キー、グリッドサイズ、スナップ ON / OFF、パネル位置）

## 9. フェーズ計画

### Phase 0: 調査 / PoC（実装の前提確認）

1. **ラウンドトリップ**: 実プロジェクトの plugins.js から SceneCustomMenu パラメータを parse → serialize し、意味等価（再 parse 一致）+ 可能ならバイト一致を確認する vitest テストを作る
2. **オーバーレイ + 入力遮断**: F9 で DOM パネルの表示 / 非表示、編集中はゲーム入力が反応しないことを確認
3. **逆変換**: Relative / originX / auto を含むサンプルシーンで「実座標 → 保存値 → 再起動 → 同位置」を確認
4. **シーン再生成方式**の確定（§8.1）

**完了条件**: 上記 4 点が動くこと。以降のフェーズはこの結果を SPEC に反映してから着手する。

### Phase 1: インスペクタ（読み取り専用）

- 全ウィンドウの枠 + Id ラベルを gizmo 表示。クリック / ツリーで選択、プロパティを読み取り表示
- **完了条件**: 自作カスタムシーンで全ウィンドウが正しく選択・閲覧できる

### Phase 2: 配置編集 + 保存

- 移動 / リサイズ、グリッド、吸着、アンカー提案、ライブ反映、バックアップ付き保存
- **完了条件**: ドラッグ結果が plugins.js に保存され、**ゲーム再起動後も同一表示**になる

### Phase 3: 構造編集

- プロパティパネル（配置タブ + 動作タブの主要項目）、テンプレ追加、削除、複製、順序変更、Id リネーム（参照追従 + スクリプト警告）
- **完了条件**: プラグイン管理画面を開かずに新規ウィンドウを 1 つ追加して動かせる

### Phase 4: 中身編集

- 中身タブ全機能（一覧プリセット、描画ブロック、コマンドリスト、フィルタ / ソート / マッピング）
- **完了条件**: 「パーティ一覧 → 詳細 → はい / いいえ」構成のシーンをゼロから GUI のみで作れる

### Phase 5: 仕上げ

- 動作タブのイベント編集完成、Undo / Redo、シーン新規作成 / 複製、詳細アコーディオン、バリデーション警告の網羅
- **完了条件**: 既存の自作シーンを本ツールだけでメンテできる状態

### v2 構想（任意・着手判断は Phase 5 後）

- Electron 単体アプリ化（rmmz_core 同梱のミニランタイム。ゲーム起動不要になる）
- シーングラフ全体図（シーン間遷移・ウィンドウ間フォーカスを矢印で可視化）

## 10. リスクと対策

| リスク | 対策 |
|---|---|
| plugins.js 破損でプロジェクト起動不能 | Phase 0 のラウンドトリップテスト必須。保存毎バックアップ + 原子的書き込み |
| MZ エディタとの同時保存競合 | mtime 監視 + 保存中止。運用ルール（プラグイン管理を閉じる）を明記 |
| SceneCustomMenu のバージョン差 | 1.53.4 固定。本体更新時は fixtures の差分テストで検知してから対応 |
| 相対アンカーの解決順 | 前方参照 / 循環をバリデーションで禁止。順序変更 UI で解消可能にする |
| ユーザースクリプト（eval 文字列）の破壊 | プリセット外は「カスタム」として値を保持。自動書き換えしない |
| 編集中のシーン再生成による状態消失 | 編集モデルはシーン外（editor/state）に保持。再生成はビューの作り直しに過ぎない設計にする |

## 11. 決定事項ログ

- **D1**: ゲーム内エディタ方式を採用（描画忠実度・実データプレビュー・fs 書き戻しのため）。外部 Electron は v2 候補
- **D2**: ランタイム非実装。SceneCustomMenu 互換パラメータの生成・編集に徹する
- **D3**: UI フレームワーク不使用（単一ファイルバンドル・依存最小化。zod のみ例外）
- **D4**: 自分専用ツール。日本語のみ、Windows + NW.js 限定。堅牢化より**復旧性（バックアップ）**を優先
- **D5**: 全パラメータのリッチ UI 化はしない。高頻度項目のみ専用 UI、残りは詳細アコーディオンで網羅
- **D6**: 対応バージョンは SceneCustomMenu 1.53.4 に固定（プロジェクト同梱版と一致させる）
