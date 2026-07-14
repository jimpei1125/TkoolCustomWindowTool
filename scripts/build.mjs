import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadPluginHeader() {
  const src = readFileSync(path.join(rootDir, 'src/pluginHeader.ts'), 'utf-8');
  const { code } = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports.PLUGIN_HEADER;
}

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [path.join(rootDir, 'src/main.ts')],
  outfile: path.join(rootDir, 'dist/SCMDesigner.js'),
  bundle: true,
  format: 'iife',
  target: 'es2019',
  // NW.js (Chromium + Node統合環境) 向け。bridge層の node:fs / node:path を
  // 外部化（require のまま残す）ために node プラットフォームを指定する。
  platform: 'node',
  banner: { js: loadPluginHeader() },
  sourcemap: false,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('watching for changes...');
} else {
  await esbuild.build(buildOptions);
}
