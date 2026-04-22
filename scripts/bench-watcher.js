#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * bench-watcher.js
 *
 * Minimal benchmark for Rust notify watcher idle CPU usage.
 * Loads the napi-rs native module directly (no Electron renderer needed).
 *
 * Usage:
 *   node scripts/bench-watcher.js [workspace-path] [sample-seconds]
 *
 * Defaults: workspace=/tmp/aide-bench-workspace  samples=60
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

// ── config ────────────────────────────────────────────────────────────────────
const WORKSPACE   = process.argv[2] ?? '/tmp/aide-bench-workspace';
const TOTAL_SECS  = parseInt(process.argv[3] ?? '60', 10);
const SETTLE_SECS = 10;  // wait for initial indexing to settle
const INTERVAL_MS = 1000;

// ── load native module ────────────────────────────────────────────────────────
// Resolve from repo root, matching the logic in fs-handlers.ts
const repoRoot  = path.resolve(__dirname, '..');
// Prefer src/main/native (latest build); fall back to .vite/build/native (post-pnpm-start copy)
const nativeDirCandidates = [
  path.join(repoRoot, 'src', 'main', 'native'),
  path.join(repoRoot, '.vite', 'build', 'native'),
];
const nativeDir = nativeDirCandidates.find(d => fs.existsSync(d)) ?? nativeDirCandidates[0];

if (!fs.existsSync(nativeDir)) {
  console.error(`[bench] Native module dir not found: ${nativeDir}`);
  console.error('[bench] Run: pnpm build:native');
  process.exit(1);
}

const nodefile = `index.${process.platform}-${process.arch}.node`;
const nodepath  = path.join(nativeDir, nodefile);
if (!fs.existsSync(nodepath)) {
  // Try gnu/musl/msvc variants
  const variants = [
    `index.${process.platform}-${process.arch}-gnu.node`,
    `index.${process.platform}-${process.arch}-musl.node`,
    `index.${process.platform}-${process.arch}-msvc.node`,
  ];
  const found = variants.find(v => fs.existsSync(path.join(nativeDir, v)));
  if (!found) {
    console.error(`[bench] No .node file for ${process.platform}-${process.arch} in ${nativeDir}`);
    process.exit(1);
  }
}

let nativeMod;
try {
  nativeMod = require(nodepath);
} catch (err) {
  console.error(`[bench] Failed to load ${nodepath}:`, err.message);
  process.exit(1);
}

if (typeof nativeMod.startWatcher !== 'function') {
  console.error('[bench] startWatcher not exported by native module');
  console.error('[bench] Exported keys:', Object.keys(nativeMod));
  process.exit(1);
}

// ── seed workspace if needed ──────────────────────────────────────────────────
if (!fs.existsSync(WORKSPACE)) {
  console.log(`[bench] Seeding workspace at ${WORKSPACE} (~500 files) …`);
  fs.mkdirSync(WORKSPACE, { recursive: true });

  // src/ — 200 .ts files
  const srcDir = path.join(WORKSPACE, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  for (let i = 0; i < 200; i++) {
    fs.writeFileSync(path.join(srcDir, `module-${i}.ts`), `export const x${i} = ${i};\n`);
  }

  // dist/ — 150 .js files
  const distDir = path.join(WORKSPACE, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  for (let i = 0; i < 150; i++) {
    fs.writeFileSync(path.join(distDir, `bundle-${i}.js`), `"use strict";var x${i}=${i};\n`);
  }

  // node_modules/ — 150 package stubs (3 dirs × 50 files each)
  for (const pkg of ['lodash', 'react', 'typescript']) {
    const pkgDir = path.join(WORKSPACE, 'node_modules', pkg);
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: pkg, version: '1.0.0' }));
    for (let i = 0; i < 49; i++) {
      fs.writeFileSync(path.join(pkgDir, `${pkg}-${i}.js`), `module.exports=${i};\n`);
    }
  }

  console.log(`[bench] Workspace seeded with ~500 files.`);
} else {
  console.log(`[bench] Using existing workspace: ${WORKSPACE}`);
}

// ── start watcher ─────────────────────────────────────────────────────────────
const exclusions = ['node_modules', '.git', 'dist', '.vite'];
let eventCount = 0;

console.log(`[bench] Starting Rust notify watcher on ${WORKSPACE} …`);
const handle = nativeMod.startWatcher(WORKSPACE, undefined, exclusions, () => {
  eventCount++;
});

const pid = process.pid;
console.log(`[bench] Process PID: ${pid}`);
console.log(`[bench] Settling for ${SETTLE_SECS}s …`);

// ── sample CPU ────────────────────────────────────────────────────────────────
const samples = [];

function sampleCpu() {
  try {
    const result = spawnSync('ps', ['-p', String(pid), '-o', '%cpu='], { encoding: 'utf8' });
    const raw = result.stdout.trim();
    const val = parseFloat(raw);
    if (!isNaN(val)) samples.push(val);
  } catch {
    // ignore
  }
}

// Wait for settle, then sample
setTimeout(() => {
  console.log(`[bench] Sampling CPU for ${TOTAL_SECS}s (1 sample/sec) …`);
  const interval = setInterval(sampleCpu, INTERVAL_MS);

  setTimeout(() => {
    clearInterval(interval);
    handle.stop();

    // ── results ───────────────────────────────────────────────────────────────
    if (samples.length === 0) {
      console.error('[bench] No samples collected — ps may have failed.');
      process.exit(1);
    }

    const min = Math.min(...samples).toFixed(1);
    const max = Math.max(...samples).toFixed(1);
    const avg = (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1);

    console.log('\n╔═════════════════════════════════════════╗');
    console.log('║   Rust notify watcher — Idle CPU        ║');
    console.log('╠═════════════════════════════════════════╣');
    console.log(`║  Samples : ${String(samples.length).padEnd(30)}║`);
    console.log(`║  Min     : ${String(min + '%').padEnd(30)}║`);
    console.log(`║  Avg     : ${String(avg + '%').padEnd(30)}║`);
    console.log(`║  Max     : ${String(max + '%').padEnd(30)}║`);
    console.log(`║  Events  : ${String(eventCount).padEnd(30)}║`);
    console.log('╚═════════════════════════════════════════╝');
    console.log('\nRaw samples (% CPU):');
    console.log(samples.join(', '));

    process.exit(0);
  }, TOTAL_SECS * 1000);

}, SETTLE_SECS * 1000);
