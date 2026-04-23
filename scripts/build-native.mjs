#!/usr/bin/env node
/**
 * Cross-platform build script for the aide-napi native module.
 *
 * Prepends $HOME/.cargo/bin to PATH so rustup's toolchain takes priority
 * over any system-installed rustc (e.g. Homebrew rustc 1.74 on macOS).
 *
 * Exits with a clear error message when cargo / rustc is not found.
 *
 * Flags:
 *   --universal   macOS only. Builds arm64 + x64 separately then lipo-merges
 *                 them into src/main/native/index.darwin-universal.node.
 *                 Requires lipo (Xcode CLT) and both rust targets installed:
 *                   rustup target add aarch64-apple-darwin x86_64-apple-darwin
 *                 Ignored on non-macOS platforms (prints warning, exits 0).
 */

import { execSync } from 'node:child_process';
import { unlinkSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const cargoBin = join(homedir(), '.cargo', 'bin');
const pathSep = process.platform === 'win32' ? ';' : ':';
const env = {
  ...process.env,
  PATH: `${cargoBin}${pathSep}${process.env.PATH ?? ''}`,
};

const universalMode =
  process.argv.includes('--universal') ||
  process.env.AIDE_NATIVE_UNIVERSAL === '1';

// Verify cargo is available before attempting build
function which(cmd) {
  try {
    execSync(
      process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`,
      { env, stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
}

if (!which('cargo')) {
  console.error(
    '\nError: cargo not found. Rust toolchain is required to build the native module.\n' +
      'Install rustup (https://rustup.rs/):\n' +
      '  curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh\n' +
      'Then restart your terminal and run `pnpm install` again.\n'
  );
  process.exit(1);
}

// ── Universal (lipo) mode ────────────────────────────────────────────────────
if (universalMode) {
  if (process.platform !== 'darwin') {
    console.error(
      '\nError: --universal is only supported on macOS (lipo is required).\n'
    );
    process.exit(1);
  }

  if (!which('lipo')) {
    console.error(
      '\nError: lipo not found. Install Xcode Command Line Tools:\n' +
        '  xcode-select --install\n'
    );
    process.exit(1);
  }

  const outputDir = 'src/main/native';
  const arm64File = `${outputDir}/index.darwin-arm64.node`;
  const x64File   = `${outputDir}/index.darwin-x64.node`;
  const univFile  = `${outputDir}/index.darwin-universal.node`;

  const baseArgs = [
    '--platform',
    '--release',
    '--js', 'false',
    '--output-dir', outputDir,
    '--manifest-path', 'crates/aide-napi/Cargo.toml',
  ];

  // Build arm64
  const arm64Cmd = ['napi', 'build', '--target', 'aarch64-apple-darwin', ...baseArgs].join(' ');
  console.log(`[build:native:universal] ${arm64Cmd}`);
  execSync(arm64Cmd, { env, stdio: 'inherit' });

  // Build x64
  const x64Cmd = ['napi', 'build', '--target', 'x86_64-apple-darwin', ...baseArgs].join(' ');
  console.log(`[build:native:universal] ${x64Cmd}`);
  execSync(x64Cmd, { env, stdio: 'inherit' });

  // lipo-merge
  const lipoCmd = `lipo -create ${arm64File} ${x64File} -output ${univFile}`;
  console.log(`[build:native:universal] ${lipoCmd}`);
  execSync(lipoCmd, { stdio: 'inherit' });

  // Remove intermediates — leave only the universal binary
  for (const f of [arm64File, x64File]) {
    if (existsSync(f)) unlinkSync(f);
  }

  console.log(`[build:native:universal] done → ${univFile}`);
  process.exit(0);
}

// ── Single-target (default) mode ─────────────────────────────────────────────
const napiCmd = [
  'napi build',
  '--platform',
  '--release',
  '--js false',
  '--output-dir src/main/native',
  '--manifest-path crates/aide-napi/Cargo.toml',
].join(' ');

console.log(`[build:native] ${napiCmd}`);

execSync(napiCmd, { env, stdio: 'inherit' });
