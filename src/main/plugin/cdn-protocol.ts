/**
 * Custom `aide-cdn://` protocol — proxies CDN requests with local caching.
 *
 * Plugins use `<script src="aide-cdn://cdn.jsdelivr.net/npm/lib@1/dist/lib.js">`
 * instead of `https://...`. The handler:
 *   1. Validates hostname against CDN allowlist
 *   2. Checks ~/.smalti/cdn-cache/ for a cached copy
 *   3. If cached: serves from disk (works offline)
 *   4. If not cached: downloads from the real HTTPS URL, caches, then serves
 *
 * Call `registerCdnProtocol()` inside app.on('ready').
 * Scheme registration is handled in protocol.ts registerCustomSchemes().
 */
import { net, protocol } from 'electron';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { getHome } from '../utils/home';

/** Only these CDN hosts are allowed — prevents data exfiltration via arbitrary URLs */
const ALLOWED_CDN_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'esm.sh',
  'cdn.skypack.dev',
  'ga.jspm.io',
]);

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

function getCacheDir(): string {
  return path.join(getHome(), '.smalti', 'cdn-cache');
}

/** Map aide-cdn://host/path?query to ~/.smalti/cdn-cache/host/path[_queryhash] */
function urlToCachePath(url: URL): string {
  const segments = (url.hostname + url.pathname)
    .split('/')
    .filter((s) => s && s !== '..');
  let cachePath = path.join(getCacheDir(), ...segments);
  // Include query string hash in cache key when present (e.g., esm.sh?target=es2022)
  if (url.search) {
    const hash = crypto.createHash('md5').update(url.search).digest('hex').slice(0, 8);
    cachePath += '_q' + hash;
  }
  return cachePath;
}

/** Read cached MIME type from .meta sidecar file */
function readCachedMime(cachePath: string): string | null {
  try {
    return fs.readFileSync(cachePath + '.meta', 'utf-8').trim();
  } catch { return null; }
}

interface DownloadResult { buffer: Buffer; mime: string }

async function downloadAndCache(realUrl: string, cachePath: string, fallbackMime: string): Promise<DownloadResult> {
  const response = await net.fetch(realUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${realUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  // Use upstream Content-Type when available (handles extensionless URLs like esm.sh/react@18)
  const upstream = response.headers.get('content-type')?.split(';')[0].trim();
  const mime = upstream || fallbackMime;

  // Atomic write: .tmp file then rename — prevents partial downloads in cache
  const tmpPath = cachePath + '.tmp.' + process.pid;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, cachePath);
  // Store MIME in sidecar for cache hits
  fs.writeFileSync(cachePath + '.meta', mime);

  return { buffer, mime };
}

export function registerCdnProtocol(): void {
  const handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    // Security: domain allowlist
    if (!ALLOWED_CDN_HOSTS.has(url.hostname)) {
      return new Response(
        `Blocked: ${url.hostname} is not an allowed CDN host. Allowed: ${[...ALLOWED_CDN_HOSTS].join(', ')}`,
        { status: 403, headers: { 'Content-Type': 'text/plain' } },
      );
    }

    const cachePath = urlToCachePath(url);

    // Security: path traversal defense-in-depth
    const resolved = path.resolve(cachePath);
    if (!resolved.startsWith(getCacheDir() + path.sep) && resolved !== getCacheDir()) {
      return new Response('Invalid cache path', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    const extMime = inferMimeType(url.pathname);

    // 1. Try cache first (works offline)
    try {
      const cached = fs.readFileSync(cachePath);
      const mime = readCachedMime(cachePath) || extMime;
      return new Response(new Uint8Array(cached), {
        headers: { 'Content-Type': mime, 'X-Smalti-Cache': 'hit' },
      });
    } catch { /* not cached */ }

    // 2. Download from real CDN, cache, then serve
    try {
      const realUrl = `https://${url.hostname}${url.pathname}${url.search}`;
      const { buffer, mime } = await downloadAndCache(realUrl, cachePath, extMime);
      return new Response(new Uint8Array(buffer), {
        headers: { 'Content-Type': mime, 'X-Smalti-Cache': 'miss' },
      });
    } catch (err) {
      return new Response(`CDN fetch failed: ${(err as Error).message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  };

  // Primary: new smalti-cdn:// scheme
  protocol.handle('smalti-cdn', handler);
  // Legacy alias: aide-cdn:// retained for backward compat (1-2 releases)
  protocol.handle('aide-cdn', handler);
}
