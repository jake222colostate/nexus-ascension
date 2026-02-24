#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const ex = promisify(execFile);
const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const tierArg = args.find((a) => a.startsWith('--tier='));
const tier = (tierArg?.split('=')[1] || 'balanced');
const ignores = ['node_modules', 'backups', '.ipynb_checkpoints', '.git', '.expo', '.bak_'];

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    const rel = path.relative(root, abs);
    if (ignores.some((i) => rel.includes(i))) continue;
    if (ent.isDirectory()) await walk(abs, out);
    else if (ent.isFile() && ent.name.endsWith('.glb') && !ent.name.endsWith('_mobile.glb')) out.push(abs);
  }
  return out;
}

function mobileOut(abs) { return abs.replace(/\.glb$/i, '_mobile.glb'); }

async function size(p) { try { return (await fs.stat(p)).size; } catch { return 0; } }

async function runOne(input, output) {
  const simplify = tier === 'aggressive' ? '0.55' : '0.78';
  const cmd = ['optimize', input, output, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', tier === 'aggressive' ? '1024' : '1536', '--simplify', simplify];
  await ex('npx', ['gltf-transform', ...cmd], { cwd: root });
}

const files = await walk(root);
console.log(`Found ${files.length} GLBs`);
console.log('input | output');
for (const f of files) console.log(`${path.relative(root, f)} | ${path.relative(root, mobileOut(f))}`);

if (!dryRun) {
  for (const f of files) {
    const out = mobileOut(f);
    await runOne(f, out);
  }
}

console.log('\nSummary');
for (const f of files) {
  const out = mobileOut(f);
  const a = await size(f);
  const b = await size(out);
  console.log(`${path.relative(root, f)}: ${(a/1024/1024).toFixed(2)}MB -> ${(b/1024/1024).toFixed(2)}MB`);
}
