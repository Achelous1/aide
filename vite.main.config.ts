import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';

// napi-rs appends a libc suffix on non-darwin platforms:
//   Linux glibc → index.linux-x64-gnu.node
//   Linux musl  → index.linux-x64-musl.node
//   Windows     → index.win32-x64-msvc.node
// Return candidates in priority order; copy the first one found in srcDir.
//
// MUST stay in sync with src/main/ipc/fs-handlers.ts:candidateNativeFilenames —
// divergence in v0.1.0 caused the universal binary not to land in .vite/build/
// → packaged app failed with "Rust native module directory not found".
function candidateNativeFilenames(): string[] {
  const base = `index.${process.platform}-${process.arch}`;
  if (process.platform === 'darwin') {
    // Prefer universal (lipo-merged arm64+x64) when present, fall back to arch-specific.
    return [`index.darwin-universal.node`, `${base}.node`];
  }
  if (process.platform === 'linux') {
    return [`${base}-gnu.node`, `${base}-musl.node`, `${base}.node`];
  }
  if (process.platform === 'win32') {
    return [`${base}-msvc.node`, `${base}.node`];
  }
  return [`${base}.node`];
}

// Plugin that copies native .node binaries into the Vite build output
// so the main process can require() them relative to __dirname at runtime.
//
// Safety guarantees:
//   1. Only copies the arch-matching .node for the current platform/arch
//      (matches the loader expectation in fs-handlers.ts).
//   2. Clears stale *.node files from dest before copying to avoid
//      accumulating old-arch binaries when switching architectures.
//   3. If build:native was never run (no matching .node in src), skips
//      silently rather than throwing — dev loop still works, tests skip.
function copyNativePlugin() {
  return {
    name: 'copy-native-modules',
    closeBundle() {
      const srcDir = resolve(__dirname, 'src/main/native');
      const destDir = resolve(__dirname, '.vite/build/native');

      // If src/main/native doesn't exist yet (build:native never run), skip.
      if (!existsSync(srcDir)) {
        console.log('[copy-native] no native dir found, skipping');
        return;
      }

      // Pick the first candidate that exists in srcDir (handles libc suffix variants).
      const candidate = candidateNativeFilenames().find((f) => existsSync(join(srcDir, f)));
      if (!candidate) {
        console.log(`[copy-native] no matching .node found in src/main/native, skipping`);
        return;
      }
      const srcPath = join(srcDir, candidate);

      // Clear any stale *.node files in dest so old-arch binaries don't linger.
      if (existsSync(destDir)) {
        for (const f of readdirSync(destDir).filter((f) => f.endsWith('.node'))) {
          rmSync(join(destDir, f));
        }
      }

      mkdirSync(destDir, { recursive: true });
      copyFileSync(srcPath, join(destDir, candidate));
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({
  plugins: [copyNativePlugin()],
  build: {
    rollupOptions: {
      external: [
        'electron',
        'node-pty',
        'fsevents',
        'electron-squirrel-startup',
      ],
    },
  },
});
