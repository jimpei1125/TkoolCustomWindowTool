import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'scmd.local.json');

if (!existsSync(configPath)) {
  console.error(
    `scmd.local.json が見つかりません。\n` +
      `プロジェクトルートに以下の内容で作成してください（Windowsパスは / 区切りにするか \\\\ でエスケープすること）:\n` +
      `{ "mzProjectPath": "C:/path/to/your/MZ/project" }`
  );
  process.exit(1);
}

// PowerShell の `Set-Content -Encoding utf8` 等が付与する UTF-8 BOM を許容する。
function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

let config;
try {
  config = JSON.parse(stripBom(readFileSync(configPath, 'utf-8')));
} catch (err) {
  console.error(
    `scmd.local.json の JSON 構文が不正です: ${err.message}\n` +
      `Windows パスのバックスラッシュ(\\)は JSON のエスケープ文字と衝突します。\n` +
      `例: "C:\\Users\\..." は不正です。次のどちらかにしてください。\n` +
      `  { "mzProjectPath": "C:/Users/zinn/Documents/RMMZ/ituhasan" }\n` +
      `  { "mzProjectPath": "C:\\\\Users\\\\zinn\\\\Documents\\\\RMMZ\\\\ituhasan" }`
  );
  process.exit(1);
}

if (!config.mzProjectPath) {
  console.error('scmd.local.json に mzProjectPath が指定されていません。');
  process.exit(1);
}

if (!existsSync(config.mzProjectPath)) {
  console.error(`mzProjectPath のフォルダが見つかりません: ${config.mzProjectPath}`);
  process.exit(1);
}

const src = path.join(rootDir, 'dist/SCMDesigner.js');
if (!existsSync(src)) {
  console.error('dist/SCMDesigner.js がありません。先に npm run build を実行してください。');
  process.exit(1);
}

const destDir = path.join(config.mzProjectPath, 'js/plugins');
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

const dest = path.join(destDir, 'SCMDesigner.js');
copyFileSync(src, dest);
console.log(`deployed: ${dest}`);
