/**
 * Custom `aide-plugin://` protocol — serves plugin HTML from the filesystem.
 *
 * Why: Electron iframes inherit the parent page's CSP.  Both `srcDoc` and
 * blob-URL iframes are blocked by `script-src 'self'`.  A custom protocol
 * gives each plugin its own origin, so inline scripts execute freely.
 *
 * Usage:
 *   1. Call `registerPluginScheme()` at module scope (before app.ready)
 *   2. Call `registerPluginProtocol(cwd)` inside app.on('ready')
 *
 * URL shape: aide-plugin://<pluginId>/index.html
 */
import { protocol } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getActiveWorkspacePath } from '../ipc/workspace-handlers';
import { getHome } from '../utils/home';

/**
 * Scan local + global plugin directories for a plugin matching `pluginId`
 * (by spec.id or spec.name) and return its index.html content.
 */
function findPluginHtml(pluginId: string, fallbackCwd: string): string | null {
  const effectiveCwd = getActiveWorkspacePath() ?? fallbackCwd;
  const dirs = [
    path.join(effectiveCwd, '.aide', 'plugins'),
    path.join(getHome(), '.aide', 'plugins'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // EPERM — skip unreadable dir rather than aborting protocol handler
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginDir = path.join(dir, entry.name);
      const specPath = path.join(pluginDir, 'plugin.spec.json');
      if (!fs.existsSync(specPath)) continue;
      try {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
        if (spec.id === pluginId || spec.name === pluginId) {
          const htmlPath = path.join(pluginDir, 'index.html');
          if (fs.existsSync(htmlPath)) return fs.readFileSync(htmlPath, 'utf-8');
          return null;
        }
      } catch { /* skip corrupted spec */ }
    }
  }
  return null;
}

/**
 * Must be called BEFORE app.whenReady() — registers the scheme as privileged
 * so Chromium treats it like https:// (standard URL parsing, secure context).
 */
export function registerCustomSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'aide-plugin',
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
    {
      scheme: 'aide-cdn',
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

/**
 * Default theme CSS variables injected into every plugin iframe.
 * Provides dark (default), .light class override, and prefers-color-scheme
 * media query fallback. Plugins can override these with higher specificity
 * if intentional custom theming is needed.
 */
const AIDE_STYLE_SHIM = `<style>:root{--background:#131519;--surface:#1A1C23;--surface-elevated:#24262E;--border:#2E3140;--text-primary:#E8E9ED;--text-secondary:#8B8D98;--text-tertiary:#5C5E6A;--accent:#10B981;--accent-warning:#F59E0B;--accent-info:#06B6D4;--scrollbar-thumb:rgba(255,255,255,0.08);--scrollbar-thumb-hover:rgba(255,255,255,0.16);--agent-claude:#D97706;--agent-gemini:#3B82F6;--agent-codex:#10B981}.light{--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669;--scrollbar-thumb:rgba(0,0,0,0.12);--scrollbar-thumb-hover:rgba(0,0,0,0.22)}@media(prefers-color-scheme:light){:root:not(.dark){--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669;--scrollbar-thumb:rgba(0,0,0,0.12);--scrollbar-thumb-hover:rgba(0,0,0,0.22)}}body{background:var(--background);color:var(--text-primary)}</style>`;

/**
 * window.aide shim injected into every plugin iframe.
 * Provides on(), invoke(), emit(), and theme listener.
 * Injected by the protocol handler so ALL plugins get it automatically —
 * no manual inclusion needed in custom HTML.
 */
const AIDE_SHIM = `<script>window.aide=(function(){var _cid=0,_cbs={};window.addEventListener("message",function(e){if(e.data&&e.data.type==="aide:file-event"){var h=_cbs[e.data.event];if(h)h.forEach(function(cb){cb(e.data);});}if(e.data&&e.data.type==="aide:invoke-result"&&_cbs["r"+e.data.callId]){_cbs["r"+e.data.callId](e.data.result);delete _cbs["r"+e.data.callId];delete _cbs["j"+e.data.callId];}if(e.data&&e.data.type==="aide:invoke-error"&&_cbs["j"+e.data.callId]){_cbs["j"+e.data.callId](new Error(e.data.error));delete _cbs["r"+e.data.callId];delete _cbs["j"+e.data.callId];}if(e.data&&e.data.theme){document.documentElement.className=e.data.theme;}});return{on:function(event,cb){if(!_cbs[event])_cbs[event]=[];_cbs[event].push(cb);},emit:function(){},invoke:function(plugin,tool,args){var id=++_cid;return new Promise(function(resolve,reject){_cbs["r"+id]=resolve;_cbs["j"+id]=reject;parent.postMessage({type:"aide:invoke",callId:id,plugin:plugin,tool:tool,args:args||{}},"*");});}};})();</script>`;

/**
 * Inject the aide shim into HTML just before </head>.
 * If no </head> tag, prepend to the HTML.
 */
function injectShim(html: string): string {
  const injection = AIDE_STYLE_SHIM + AIDE_SHIM;
  const headClose = html.indexOf('</head>');
  if (headClose !== -1) {
    return html.slice(0, headClose) + injection + html.slice(headClose);
  }
  // No </head> — prepend so style takes effect before body renders
  return injection + html;
}

/**
 * Must be called AFTER app.whenReady() — installs the request handler.
 */
export function registerPluginProtocol(cwd: string): void {
  protocol.handle('aide-plugin', (request) => {
    const url = new URL(request.url);
    const pluginId = url.hostname;

    const html = findPluginHtml(pluginId, cwd);
    if (!html) {
      return new Response('Plugin not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return new Response(injectShim(html), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  });
}
