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
import { userInfo } from 'os';
import * as path from 'path';
import { getActiveWorkspacePath } from '../ipc/workspace-handlers';

function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  try { return userInfo().homedir; } catch { /* ignore */ }
  return '/tmp';
}

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
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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
export function registerPluginScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'aide-plugin',
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

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
  const headClose = html.indexOf('</head>');
  if (headClose !== -1) {
    return html.slice(0, headClose) + AIDE_SHIM + html.slice(headClose);
  }
  return AIDE_SHIM + html;
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
