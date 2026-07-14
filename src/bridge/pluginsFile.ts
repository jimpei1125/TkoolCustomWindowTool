// plugins.js の読み書き・バックアップ・競合検出（SPEC.md §4.2, §8.2, §8.3）。
//
// 絶対に守るルール（CLAUDE.md）:
//  1. 書き込みは必ず「バックアップ → 一時ファイル → rename」の経路を通す
//  2. 非破壊原則: SceneCustomMenu エントリの、編集対象シーンのパラメータキー
//     以外は一切書き換えない（他プラグイン・他シーンのパラメータは
//     もとの文字列のまま温存する）

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseStruct, serializeStruct } from '../model/mzformat';

export interface PluginEntry {
  name: string;
  status: boolean;
  parameters: Record<string, string>;
  [key: string]: unknown;
}

interface RawPluginsFile {
  plugins: PluginEntry[];
  prefix: string;
  suffix: string;
  mtimeMs: number;
}

const PLUGINS_PATTERN = /var\s+\$plugins\s*=\s*(\[[\s\S]*\])\s*;?\s*$/;
const SCENE_CUSTOM_MENU_PLUGIN_NAME = 'SceneCustomMenu';
const MAX_BACKUPS = 20;

function splitPluginsText(text: string): { prefix: string; json: string; suffix: string } {
  const match = PLUGINS_PATTERN.exec(text);
  const arrayText = match?.[1];
  if (!match || match.index === undefined || arrayText === undefined) {
    throw new Error('plugins.js の形式を認識できませんでした（var $plugins = [...] が見つかりません）');
  }
  const arrayStart = match.index + match[0].indexOf(arrayText);
  const prefix = text.slice(0, arrayStart);
  const suffix = text.slice(arrayStart + arrayText.length);
  return { prefix, json: arrayText, suffix };
}

function serializePluginsArray(plugins: PluginEntry[]): string {
  return `[\n${plugins.map((p) => JSON.stringify(p)).join(',\n')}\n]`;
}

function readRaw(filePath: string): RawPluginsFile {
  const text = fs.readFileSync(filePath, 'utf-8');
  const { prefix, json, suffix } = splitPluginsText(text);
  const plugins = JSON.parse(json) as PluginEntry[];
  const stat = fs.statSync(filePath);
  return { plugins, prefix, suffix, mtimeMs: stat.mtimeMs };
}

function writeAtomic(filePath: string, prefix: string, plugins: PluginEntry[], suffix: string): void {
  const tmpPath = `${filePath}.scmd-tmp`;
  const content = prefix + serializePluginsArray(plugins) + suffix;
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function backup(filePath: string, backupDir: string): void {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, `plugins_${formatTimestamp(new Date())}.js`);
  fs.copyFileSync(filePath, dest);

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('plugins_') && f.endsWith('.js'))
    .sort();
  const excess = Math.max(0, files.length - MAX_BACKUPS);
  for (const file of files.slice(0, excess)) {
    fs.unlinkSync(path.join(backupDir, file));
  }
}

/**
 * SceneCustomMenu の parameters から、指定した Id 集合とちょうど一致する
 * WindowList を持つ SceneData を探す。SceneCustomMenu.js の内部実装（シーンIDの
 * 保持方法）に依存せず、公開されているデータ構造のみで対象シーンを特定するための方式
 * （前回の実装計画で承認済み）。
 */
export function findMatchingSceneKey(
  parameters: Record<string, string>,
  windowIds: ReadonlySet<string>
): { key: string; sceneData: Record<string, unknown> } | null {
  for (const [key, raw] of Object.entries(parameters)) {
    let parsed: Record<string, unknown> | '';
    try {
      parsed = parseStruct(raw, 'SceneData');
    } catch {
      continue;
    }
    if (parsed === '') continue;
    const windowList = parsed.WindowList;
    if (!Array.isArray(windowList)) continue;
    const ids = windowList
      .filter((w): w is Record<string, unknown> => typeof w === 'object' && w !== null)
      .map((w) => w.Id)
      .filter((id): id is string => typeof id === 'string');
    if (ids.length !== windowIds.size) continue;
    if (ids.every((id) => windowIds.has(id))) {
      return { key, sceneData: parsed };
    }
  }
  return null;
}

export interface LoadedScmScene {
  sceneKey: string;
  sceneData: Record<string, unknown>;
  mtimeMs: number;
}

/** 現在表示中シーンの WindowId 集合から、対応する SceneData を plugins.js から読み込む。 */
export function loadScmSceneForWindowIds(
  pluginsPath: string,
  windowIds: ReadonlySet<string>
): LoadedScmScene | null {
  const { plugins, mtimeMs } = readRaw(pluginsPath);
  const entry = plugins.find((p) => p.name === SCENE_CUSTOM_MENU_PLUGIN_NAME);
  if (!entry) return null;
  const match = findMatchingSceneKey(entry.parameters, windowIds);
  if (!match) return null;
  return { sceneKey: match.key, sceneData: match.sceneData, mtimeMs };
}

export class PluginsFileConflictError extends Error {}

/**
 * 指定した sceneKey の SceneData のみを書き換えて保存する。
 * 他のプラグイン・他のシーンのパラメータ文字列はそのまま温存する。
 */
export function saveScmScene(
  pluginsPath: string,
  backupDir: string,
  sceneKey: string,
  sceneData: Record<string, unknown>,
  expectedMtimeMs: number
): { mtimeMs: number } {
  const { plugins, prefix, suffix, mtimeMs } = readRaw(pluginsPath);
  if (mtimeMs !== expectedMtimeMs) {
    throw new PluginsFileConflictError(
      'plugins.js が外部で変更されています。保存を中止しました。エディタを再読み込みしてください。'
    );
  }
  const entry = plugins.find((p) => p.name === SCENE_CUSTOM_MENU_PLUGIN_NAME);
  if (!entry) {
    throw new Error('plugins.js に SceneCustomMenu のエントリが見つかりません。');
  }
  entry.parameters[sceneKey] = serializeStruct(sceneData, 'SceneData');

  backup(pluginsPath, backupDir);
  writeAtomic(pluginsPath, prefix, plugins, suffix);

  return { mtimeMs: fs.statSync(pluginsPath).mtimeMs };
}
