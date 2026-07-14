import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'scmd.local.json');

if (!existsSync(configPath)) {
  console.error(
    `scmd.local.json が見つかりません。\n` +
      `プロジェクトルートに以下の内容で作成してください:\n` +
      `{ "mzProjectPath": "C:/path/to/your/MZ/project" }`
  );
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));
if (!config.mzProjectPath) {
  console.error('scmd.local.json に mzProjectPath が指定されていません。');
  process.exit(1);
}

const src = path.join(rootDir, 'dist/SCMDesigner.js');
if (!existsSync(src)) {
  console.error('dist/SCMDesigner.js がありません。先に npm run build を実行してください。');
  process.exit(1);
}

const dest = path.join(config.mzProjectPath, 'js/plugins/SCMDesigner.js');
copyFileSync(src, dest);
console.log(`deployed: ${dest}`);
