// プロジェクトルート / plugins.js / バックアップ先のパス解決（SPEC.md §4.2 bridge/projectPath.ts）。
//
// NW.js テストプレイ時、カレントディレクトリ（process.cwd()）は
// MZ プロジェクトルート（index.html, js/, data/ 等がある場所）と一致する想定。
// この前提は実機（NW.js テストプレイ）での確認が必要。

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
