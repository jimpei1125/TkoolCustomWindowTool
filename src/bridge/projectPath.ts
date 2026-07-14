// プロジェクトルート / plugins.js / バックアップ先のパス解決（SPEC.md §4.2 bridge/projectPath.ts）。
//
// NW.js テストプレイ時、カレントディレクトリ（process.cwd()）は
// MZ プロジェクトルート（index.html, js/, data/ 等がある場所）と一致する。
// Phase 2 の実機確認（plugins.js の読み込み/保存）で確認済み。

import * as fs from 'fs';
import * as path from 'path';

export function getProjectRoot(): string {
  return process.cwd();
}

export function getPluginsFilePath(): string {
  return path.join(getProjectRoot(), 'js', 'plugins.js');
}

export function getBackupDir(): string {
  return path.join(getProjectRoot(), 'scmd_backup');
}

export function getImgSystemDir(): string {
  return path.join(getProjectRoot(), 'img', 'system');
}

/** img/system 内の画像ファイル名（拡張子・ディレクトリを除く）を列挙する。WindowSkin 選択用。 */
export function listImgSystemFiles(): string[] {
  const dir = getImgSystemDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => f.slice(0, -'.png'.length))
    .sort();
}
