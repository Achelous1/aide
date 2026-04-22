import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Plugin that copies native .node binaries into the Vite build output
// so the main process can require() them relative to __dirname at runtime.
function copyNativePlugin() {
  return {
    name: 'copy-native-modules',
    closeBundle() {
      const srcDir = resolve(__dirname, 'src/main/native');
      const destDir = resolve(__dirname, '.vite/build/native');
      if (!existsSync(srcDir)) return;
      const nodes = readdirSync(srcDir).filter((f) => f.endsWith('.node'));
      if (nodes.length === 0) return;
      mkdirSync(destDir, { recursive: true });
      for (const f of nodes) {
        copyFileSync(join(srcDir, f), join(destDir, f));
      }
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
