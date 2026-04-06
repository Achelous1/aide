/**
 * Custom `aide-cdn://` protocol — proxies CDN requests with local caching.
 *
 * Plugins use `<script src="aide-cdn://cdn.jsdelivr.net/npm/lib@1/dist/lib.js">`
 * instead of `https://...`. The handler:
 *   1. Checks ~/.aide/cdn-cache/ for a cached copy
 *   2. If cached: serves from disk (works offline)
 *   3. If not cached: downloads from the real HTTPS URL, caches, then serves
 *
 * Call `registerCdnProtocol()` inside app.on('ready').
 * Scheme registration is handled in protocol.ts registerCustomSchemes().
 */
import { net, protocol } from 'electron';
import * as fs from 'fs';
import { userInfo } from 'os';
import * as path from 'path';

function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  try { return userInfo().homedir; } catch { /* ignore */ }
  return '/tmp';
}

const MIME_MAP: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function inferMimeType(pathname: string): string {
  const ext = path.extname(pathname).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

/** Map aide-cdn://host/path to ~/.aide/cdn-cache/host/path */
function urlToCachePath(url: URL): string {
  const cacheDir = path.join(getHome(), '.aide', 'cdn-cache');
  const segments = (url.hostname + url.pathname)
    .split('/')
    .filter((s) => s && s !== '..');
  return path.join(cacheDir, ...segments);
}

async function downloadAndCache(realUrl: string, cachePath: string): Promise<Buffer> {
  const response = await net.fetch(realUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${realUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // Atomic write: .tmp file then rename — prevents partial downloads in cache
  const tmpPath = cachePath + '.tmp.' + process.pid;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, cachePath);

  return buffer;
}

export function registerCdnProtocol(): void {
  protocol.handle('aide-cdn', async (request) => {
    const url = new URL(request.url);
    // aide-cdn://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js
    // → https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js
    const realUrl = `https://${url.hostname}${url.pathname}${url.search}`;
    const cachePath = urlToCachePath(url);
    const mime = inferMimeType(url.pathname);

    // 1. Try cache first (works offline)
    try {
      const cached = fs.readFileSync(cachePath);
      return new Response(cached, {
        headers: { 'Content-Type': mime, 'X-AIDE-Cache': 'hit' },
      });
    } catch { /* not cached */ }

    // 2. Download from real CDN, cache, then serve
    try {
      const data = await downloadAndCache(realUrl, cachePath);
      return new Response(data, {
        headers: { 'Content-Type': mime, 'X-AIDE-Cache': 'miss' },
      });
    } catch (err) {
      return new Response(`CDN fetch failed: ${(err as Error).message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  });
}
