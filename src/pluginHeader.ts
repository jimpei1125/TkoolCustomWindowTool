// esbuild の banner に埋め込まれる RPGツクールMZ プラグインヘッダ。
// この文字列自体はビルド成果物の先頭コメントとしてのみ使われ、実行時コードには含まれない。
export const PLUGIN_HEADER = `/*:ja
 * @target MZ
 * @plugindesc [Phase 3] SceneCustomMenu パラメータのビジュアルエディタ（開発専用・自分専用ツール）
 * @author (self)
 * @orderAfter PluginCommonBase
 * @orderAfter SceneCustomMenu
 * @url
 *
 * @param startupKey
 * @text 起動キー
 * @desc エディタの表示/非表示を切り替えるキー。KeyboardEvent.key の値（例: F9）で指定する。
 * @type string
 * @default F9
 *
 * @help SCMDesigner.js
 *
 * SceneCustomMenu.js（トリアコンタン氏製・1.53.4 固定）のパラメータを、
 * テストプレイ中にドラッグ&ドロップと選択式 UI で視覚的に編集し、
 * js/plugins.js に書き戻す開発専用プラグインです。
 *
 * - ランタイム機能は一切追加しません。実行時の描画・シーン遷移は
 *   SceneCustomMenu.js にすべて委譲します。
 * - NW.js テストプレイ中（Utils.isOptionValid('test') && Utils.isNwjs()）
 *   以外では完全に非活性化されます。配布ビルドでは動作しません。
 * - 本プラグインは PluginCommonBase と SceneCustomMenu の**後**に
 *   プラグイン管理画面で配置してください。
 *
 * 現在のビルドは Phase 0（調査 / PoC）〜 Phase 3（構造編集）の範囲です。
 * - オーバーレイの表示/非表示切り替え（起動キー）、編集中のゲーム入力遮断の PoC
 * - SceneCustomMenu パラメータ形式のラウンドトリップ（parse/serialize）
 * - カスタムメニューシーン表示中、全ウィンドウの選択枠 + Id ラベル表示、
 *   ツリー / gizmo クリックによる選択
 * - ドラッグでの移動 / 8方向ハンドルでのリサイズ（グリッド・端吸着・ガイド線）
 * - plugins.js からのシーン読み込み、バックアップ付き保存、外部変更の競合検出
 * - テンプレートからのウィンドウ追加、削除、複製、順序変更、Id リネーム
 *   （参照追従 + スクリプト内直書き参照の警告）
 * - プロパティパネルの配置タブ・動作タブでの編集
 * のみを含み、中身タブ（一覧プリセット/描画ブロック/コマンドリスト編集）や
 * Undo/Redo 等はまだ含まれません。新規追加したウィンドウは保存後の
 * ゲーム再起動で反映されます（ライブ反映はしません）。
 *
 * このプラグインには利用規約はありません。自分専用の内製ツールです。
 */
`;
