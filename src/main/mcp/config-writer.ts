/**
 * Writes the AIDE MCP server script and config to userData at startup.
 * The server runs as a standalone Node.js process — agents connect via --mcp-config.
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getHome } from '../utils/home';

function getUserData(): string {
  return app.getPath('userData');
}

/** Resolve absolute path to node binary — needed because claude spawns MCP with a minimal PATH */
function resolveNodePath(): string {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    try {
      return execSync('where node', { encoding: 'utf-8' }).split('\n')[0].trim();
    } catch {
      return 'node.exe';
    }
  } else {
    const candidates = [
      '/opt/homebrew/bin/node',  // macOS Apple Silicon (Homebrew)
      '/usr/local/bin/node',     // macOS Intel (Homebrew) / nvm
      '/usr/bin/node',           // Linux system
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    try {
      return execSync('which node', { encoding: 'utf-8' }).trim();
    } catch {
      return 'node';
    }
  }
}

export function getMcpConfigPath(): string {
  return path.join(getUserData(), 'mcp-config.json');
}

export function getMcpServerPath(): string {
  // Use ~/.aide/ instead of userData — userData path contains "Application Support"
  // which has a space that Claude Code CLI mishandles when spawning the MCP process.
  return path.join(getHome(), '.aide', 'aide-mcp-server.js');
}

/**
 * Shared helper: merges the AIDE MCP server entry into a JSON config file.
 * Safe to call multiple times — merges rather than overwrites.
 */
function registerJsonMcpConfig(configPath: string, nodePath: string, serverPath: string, globalPluginsDir: string): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Corrupt file — start fresh
    }
  }
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }
  (config.mcpServers as Record<string, unknown>)['aide'] = {
    command: nodePath,
    args: [serverPath],
    // Global registration only sets AIDE_GLOBAL_PLUGINS_DIR.
    // AIDE_PLUGINS_DIR and AIDE_WORKSPACE are workspace-specific and set via --mcp-config.
    env: { AIDE_GLOBAL_PLUGINS_DIR: globalPluginsDir },
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Removes the [mcp_servers.aide] section from a TOML string (line-by-line, safe for array values).
 */
function removeTomlSection(content: string, sectionHeader: string): string {
  const lines = content.split('\n');
  let inSection = false;
  return lines.filter((line) => {
    if (line.trimEnd() === sectionHeader) { inSection = true; return false; }
    if (inSection && line.startsWith('[')) inSection = false;
    return !inSection;
  }).join('\n');
}

export function writeMcpConfig(workspacePath: string): string {
  const home = getHome();
  const globalPluginsDir = path.join(home, '.aide', 'plugins');
  const localPluginsDir = path.join(workspacePath, '.aide', 'plugins');
  const nodePath = resolveNodePath();
  const serverPath = getMcpServerPath();

  fs.mkdirSync(globalPluginsDir, { recursive: true });
  fs.mkdirSync(localPluginsDir, { recursive: true });

  writeMcpServerScript();

  // Register in ~/.claude.json (Claude uses --mcp-config per-workspace; global is a fallback)
  try {
    registerJsonMcpConfig(path.join(home, '.claude.json'), nodePath, serverPath, globalPluginsDir);
  } catch (err) {
    console.warn('[AIDE] Failed to register Claude MCP config:', (err as Error).message);
  }

  // Register in ~/.gemini/settings.json (Gemini has no --mcp-config flag)
  try {
    registerJsonMcpConfig(path.join(home, '.gemini', 'settings.json'), nodePath, serverPath, globalPluginsDir);
  } catch (err) {
    console.warn('[AIDE] Failed to register Gemini MCP config:', (err as Error).message);
  }

  // Register in ~/.codex/config.toml (Codex has no --mcp-config flag)
  try {
    const codexConfigPath = path.join(home, '.codex', 'config.toml');
    fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
    let content = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath, 'utf-8') : '';
    content = removeTomlSection(content, '[mcp_servers.aide]');
    const prefix = content.trimEnd();
    const block = `[mcp_servers.aide]\ncommand = ${JSON.stringify(nodePath)}\nargs = [${JSON.stringify(serverPath)}]\nenv = { AIDE_GLOBAL_PLUGINS_DIR = ${JSON.stringify(globalPluginsDir)} }\n`;
    fs.writeFileSync(codexConfigPath, prefix.length > 0 ? `${prefix}\n\n${block}` : block);
  } catch (err) {
    console.warn('[AIDE] Failed to register Codex MCP config:', (err as Error).message);
  }

  const config = {
    mcpServers: {
      aide: {
        command: 'node',
        args: [getMcpServerPath()],
        env: {
          AIDE_GLOBAL_PLUGINS_DIR: globalPluginsDir,
          AIDE_PLUGINS_DIR: localPluginsDir,
          AIDE_WORKSPACE: workspacePath,
        },
      },
    },
  };

  const mcpConfigPath = getMcpConfigPath();
  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  return mcpConfigPath;
}

function writeMcpServerScript(): void {
  fs.mkdirSync(path.dirname(getMcpServerPath()), { recursive: true });
  // Embedded MCP server — self-contained, no external dependencies
  const script = `#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const GLOBAL_PLUGINS_DIR = process.env.AIDE_GLOBAL_PLUGINS_DIR || "";
const PLUGINS_DIR = process.env.AIDE_PLUGINS_DIR || path.join(process.cwd(), ".aide", "plugins");
const WORKSPACE = process.env.AIDE_WORKSPACE || process.cwd();

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\\n");
}
function sendResult(id, result) { send({ jsonrpc: "2.0", id, result }); }
function sendError(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

function scanPluginsDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const specs = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(dir, entry.name, "plugin.spec.json");
    if (!fs.existsSync(specPath)) continue;
    try { specs.push(JSON.parse(fs.readFileSync(specPath, "utf-8"))); } catch {}
  }
  return specs;
}

function listPluginSpecs() {
  const globalSpecs = scanPluginsDir(GLOBAL_PLUGINS_DIR);
  const localSpecs = scanPluginsDir(PLUGINS_DIR);
  // Merge: local overrides global if same name
  const byName = new Map();
  for (const s of globalSpecs) byName.set(s.name, s);
  for (const s of localSpecs) byName.set(s.name, s);
  return Array.from(byName.values());
}

function resolvePluginDir(pluginName) {
  // Local first, then global
  if (PLUGINS_DIR) {
    const localDir = path.join(PLUGINS_DIR, pluginName);
    const localResolved = path.resolve(localDir);
    if (localResolved.startsWith(path.resolve(PLUGINS_DIR) + path.sep) && fs.existsSync(path.join(localDir, "src", "index.js"))) {
      return { dir: localDir, base: PLUGINS_DIR };
    }
  }
  if (GLOBAL_PLUGINS_DIR) {
    const globalDir = path.join(GLOBAL_PLUGINS_DIR, pluginName);
    const globalResolved = path.resolve(globalDir);
    if (globalResolved.startsWith(path.resolve(GLOBAL_PLUGINS_DIR) + path.sep) && fs.existsSync(path.join(globalDir, "src", "index.js"))) {
      return { dir: globalDir, base: GLOBAL_PLUGINS_DIR };
    }
  }
  return null;
}

function invokePluginTool(pluginName, toolName, args) {
  const resolved = resolvePluginDir(pluginName);
  if (!resolved) throw new Error("Plugin not found: " + pluginName);
  // Read permissions from spec
  var permissions = [];
  try { permissions = JSON.parse(fs.readFileSync(path.join(resolved.dir, "plugin.spec.json"), "utf-8")).permissions || []; } catch {}
  var hasFsRead = permissions.includes("fs:read");
  var hasFsWrite = permissions.includes("fs:write");
  var hasFsPerm = hasFsRead || hasFsWrite;
  var ws = WORKSPACE;
  function assertInWs(p) {
    if (!p.startsWith(ws + path.sep) && p !== ws) throw new Error("Access denied: path outside workspace");
  }
  function assertRead() { if (!hasFsRead) throw new Error("Permission denied: fs:read not granted"); }
  function assertWrite() { if (!hasFsWrite) throw new Error("Permission denied: fs:write not granted"); }
  var scopedFs = {
    read: function(fp) { assertRead(); var a = path.resolve(ws, fp); assertInWs(a); return fs.readFileSync(a, "utf-8"); },
    write: function(fp, c) { assertWrite(); var a = path.resolve(ws, fp); assertInWs(a); fs.writeFileSync(a, c); },
    existsSync: function(fp) { var a = path.resolve(ws, fp); assertInWs(a); return fs.existsSync(a); },
    readFileSync: function(fp, enc) { assertRead(); var a = path.resolve(ws, fp); assertInWs(a); return enc ? fs.readFileSync(a, enc) : fs.readFileSync(a); },
    writeFileSync: function(fp, c) { assertWrite(); var a = path.resolve(ws, fp); assertInWs(a); fs.writeFileSync(a, c); },
    mkdirSync: function(fp, opts) { assertWrite(); var a = path.resolve(ws, fp); assertInWs(a); fs.mkdirSync(a, opts); },
    readdirSync: function(fp, opts) { assertRead(); var a = path.resolve(ws, fp); assertInWs(a); return fs.readdirSync(a, opts); },
    statSync: function(fp) { var a = path.resolve(ws, fp); assertInWs(a); return fs.statSync(a); },
    unlinkSync: function(fp) { assertWrite(); var a = path.resolve(ws, fp); assertInWs(a); fs.unlinkSync(a); }
  };
  var sandboxRequire = function(id) {
    if (id === "path") return path;
    if (id === "fs" && hasFsPerm) return scopedFs;
    throw new Error("require('" + id + "') is not allowed in plugin sandbox");
  };
  const entryPath = path.join(resolved.dir, "src", "index.js");
  const code = fs.readFileSync(entryPath, "utf-8");
  const sandbox = {
    module: { exports: {} }, exports: {},
    require: sandboxRequire,
    Buffer: Buffer,
    console: { log: function(){}, error: function(){}, warn: function(){} },
    aide: {
      fs: scopedFs,
      plugin: { id: pluginName, name: pluginName, version: "0.1.0" },
      files: { reveal: function(){}, select: function(){}, refresh: function(){} },
      plugins: { emit: function(){} }
    }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { timeout: 5000 });
  const mod = sandbox.module.exports;
  if (typeof mod.invoke === "function") return mod.invoke(toolName, args);
  throw new Error("Plugin " + pluginName + " has no invoke method");
}

function createPlugin(params) {
  const scope = params.scope || "local";
  const baseDir = scope === "global" ? GLOBAL_PLUGINS_DIR : PLUGINS_DIR;
  if (!baseDir) throw new Error(scope === "global" ? "AIDE_GLOBAL_PLUGINS_DIR not set" : "AIDE_PLUGINS_DIR not set");
  const safeName = params.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const pluginDir = path.join(baseDir, safeName);
  if (!path.resolve(pluginDir).startsWith(path.resolve(baseDir))) throw new Error("Invalid plugin name");
  const id = "plugin-" + crypto.randomUUID().slice(0, 8);
  const tools = params.tools || [{ name: safeName + "-run", description: "Execute " + params.name, parameters: { input: { type: "string", required: true } } }];
  const spec = { id, name: safeName, description: params.description, version: "0.1.0", permissions: params.permissions || ["fs:read"], entryPoint: "src/index.js", tools };
  fs.mkdirSync(path.join(pluginDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "mcp"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "skill"), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, "plugin.spec.json"), JSON.stringify(spec, null, 2));
  fs.writeFileSync(path.join(pluginDir, "tool.json"), JSON.stringify({ pluginId: id, pluginName: safeName, version: "0.1.0", tools }, null, 2));
  fs.writeFileSync(path.join(pluginDir, "src", "index.js"), params.code);
  const indexHtml = params.html ? params.html : ('<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><style>' +
    ':root{--background:#131519;--surface:#1A1C23;--surface-elevated:#24262E;--border:#2E3140;--text-primary:#E8E9ED;--text-secondary:#8B8D98;--text-tertiary:#5C5E6A;--accent:#10B981;--accent-warning:#F59E0B;--accent-info:#06B6D4;--scrollbar-thumb:rgba(255,255,255,0.08);--scrollbar-thumb-hover:rgba(255,255,255,0.16)}' +
    '.light{--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669;--scrollbar-thumb:rgba(0,0,0,0.12);--scrollbar-thumb-hover:rgba(0,0,0,0.22)}' +
    '@media(prefers-color-scheme:light){:root:not(.dark){--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669;--scrollbar-thumb:rgba(0,0,0,0.12);--scrollbar-thumb-hover:rgba(0,0,0,0.22)}}' +
    'body{margin:0;font-family:monospace;font-size:12px;background:var(--background);color:var(--text-primary)}' +
    '*{scrollbar-width:thin;scrollbar-color:var(--scrollbar-thumb) transparent}' +
    '*::-webkit-scrollbar{width:10px;height:10px}' +
    '*::-webkit-scrollbar-track{background:transparent}' +
    '*::-webkit-scrollbar-thumb{background-color:var(--scrollbar-thumb);border-radius:8px;border:2px solid transparent;background-clip:content-box;transition:background-color 150ms ease-out}' +
    '*::-webkit-scrollbar-thumb:hover{background-color:var(--scrollbar-thumb-hover)}' +
    '*::-webkit-scrollbar-corner{background:transparent}' +
    '</style><script>window.aide=(function(){var _cid=0,_cbs={};window.addEventListener("message",function(e){if(e.data&&e.data.type==="aide:file-event"){var h=_cbs[e.data.event];if(h)h.forEach(function(cb){cb(e.data);});}if(e.data&&e.data.type==="aide:invoke-result"&&_cbs["r"+e.data.callId]){_cbs["r"+e.data.callId](e.data.result);delete _cbs["r"+e.data.callId];delete _cbs["j"+e.data.callId];}if(e.data&&e.data.type==="aide:invoke-error"&&_cbs["j"+e.data.callId]){_cbs["j"+e.data.callId](new Error(e.data.error));delete _cbs["r"+e.data.callId];delete _cbs["j"+e.data.callId];}if(e.data&&e.data.theme){document.documentElement.className=e.data.theme;}});return{on:function(event,cb){if(!_cbs[event])_cbs[event]=[];_cbs[event].push(cb);},emit:function(){},invoke:function(plugin,tool,args){var id=++_cid;return new Promise(function(resolve,reject){_cbs["r"+id]=resolve;_cbs["j"+id]=reject;parent.postMessage({type:"aide:invoke",callId:id,plugin:plugin,tool:tool,args:args||{}},"*");});}};})();</script></head><body>' +
    '<div id="root" style="padding:12px;">' +
    '<p style="color:var(--text-secondary)">Plugin: ' + safeName + '</p>' +
    '<p style="color:var(--text-tertiary);font-size:10px;">' + (params.description || '') + '</p>' +
    '</div></body></html>');
  fs.writeFileSync(path.join(pluginDir, "index.html"), indexHtml);
  try { vm.compileFunction(params.code, [], { filename: "index.js" }); } catch (err) {
    fs.rmSync(pluginDir, { recursive: true });
    throw new Error("Plugin code compilation failed: " + err.message);
  }
  return spec;
}

function editPlugin(params) {
  const resolved = resolvePluginDir(params.name);
  if (!resolved) throw new Error("Plugin not found: " + params.name);
  const pluginDir = resolved.dir;
  const specPath = path.join(pluginDir, "plugin.spec.json");
  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
  if (params.description) spec.description = params.description;
  if (params.permissions) spec.permissions = params.permissions;
  if (params.tools) {
    spec.tools = params.tools;
    fs.writeFileSync(path.join(pluginDir, "tool.json"), JSON.stringify({ pluginId: spec.id, pluginName: spec.name, version: spec.version, tools: params.tools }, null, 2));
  }
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  if (params.code) {
    try { vm.compileFunction(params.code, [], { filename: "index.js" }); } catch (err) {
      throw new Error("Plugin code compilation failed: " + err.message);
    }
    fs.writeFileSync(path.join(pluginDir, "src", "index.js"), params.code);
  }
  if (params.html) fs.writeFileSync(path.join(pluginDir, "index.html"), params.html);
  return spec;
}

function getBuiltinTools() {
  const builtins = [
    { name: "aide_create_plugin", description: "Create a new AIDE plugin from code. The code must be a CommonJS module exporting { name, version, tools, invoke(toolName, args) }.\\n\\nSandbox Environment:\\n- require('path') → always available\\n- require('fs') → scoped to workspace directory (requires fs:read or fs:write permission). Available methods: existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync. All paths resolved relative to workspace root.\\n- require('fs') needs plugin permissions: fs:read for read operations, fs:write for write operations\\n- Buffer global available\\n- console.log/error/warn available\\n- aide.fs → same scoped fs object. Methods: read(path), write(path,content), existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync\\n- aide.files.reveal(path) / aide.files.select(path) / aide.files.refresh() → control the FILES tab (no-op in MCP context, functional in Electron UI)\\n- aide.plugins.emit(event, data) → broadcast event to other plugins (no-op in MCP context)\\n- No network access, no child_process, no other Node.js modules\\n- An index.html is auto-generated for iframe rendering. Pass the optional 'html' parameter to aide_create_plugin to provide a custom UI in one step.\\n\\nHTML UI (iframe) Event API:\\nPlugin iframes receive FILES tab events via postMessage from the AIDE renderer.\\n\\nConstraints (sandbox=\\"allow-scripts\\", no allow-same-origin):\\n- file:// URLs are BLOCKED inside the iframe. Never set frame.src = 'file://' + path.\\n- To display file content, use window.aide.invoke() to call a backend tool, then render with a blob URL.\\n- data.filePath is an absolute OS path (e.g. /Users/alice/project/src/main.ts on macOS).\\n\\nAvailable iframe APIs:\\n  window.aide.on(event, cb) — listen for file events (file:clicked, file:right-clicked)\\n  window.aide.invoke(plugin, tool, args) — call a plugin backend tool, returns a Promise\\n  window.aide.emit() — reserved for future use\\n\\nEvents fire on every file click — eventBindings are NOT required for iframe postMessage:\\n  window.aide.on('file:clicked', function(data) { /* data.filePath — absolute path */ })\\n  window.aide.on('file:right-clicked', function(data) { /* data.filePath */ })\\n\\nInvoking backend tools from iframe:\\n  window.aide.invoke('my-plugin', 'get_html_content', { filePath: data.filePath })\\n    .then(function(content) {\\n      var blob = new Blob([content], { type: 'text/html' });\\n      document.getElementById('preview').src = URL.createObjectURL(blob);\\n    });\\n\\nCRITICAL — window.aide shim is NOT auto-injected into custom HTML. Auto-generated HTML includes it, but if you pass the 'html' parameter you MUST include the full shim (with on, invoke, and theme support). See the auto-generated HTML source for reference.\\n\\neventBindings (.aide/settings.json): controls backend tool invocation on file events only — separate from iframe postMessage.\\n  Example: { \\"eventBindings\\": { \\"file:clicked\\": [{ \\"plugin\\": \\"my-plugin\\", \\"tool\\": \\"on-file-clicked\\", \\"args\\": {} }] } }\\n\\nIMPORTANT — AIDE Design System Rules:\\nIf the plugin produces UI output (HTML/CSS), it MUST use these CSS custom properties (not hardcoded colors):\\n\\nDark theme (default):\\n  --background: #131519, --surface: #1A1C23, --surface-elevated: #24262E\\n  --border: #2E3140, --text-primary: #E8E9ED, --text-secondary: #8B8D98\\n  --text-tertiary: #5C5E6A, --accent: #10B981 (emerald green)\\n  --accent-warning: #F59E0B, --accent-info: #06B6D4\\n  --scrollbar-thumb: rgba(255,255,255,0.08), --scrollbar-thumb-hover: rgba(255,255,255,0.16)\\n  --agent-claude: #D97706 (amber), --agent-gemini: #3B82F6 (blue), --agent-codex: #10B981 (green)\\n\\nLight theme (.light class on root):\\n  --background: #F5F5F0, --surface: #FAFAF7, --surface-elevated: #EBEBE6\\n  --border: #E0E3E8, --text-primary: #0D0D0D, --text-secondary: #6B7280\\n  --text-tertiary: #9CA3AF, --accent: #059669\\n  --scrollbar-thumb: rgba(0,0,0,0.12), --scrollbar-thumb-hover: rgba(0,0,0,0.22)\\n\\nStyle rules:\\n- Use CSS var() references: color: var(--text-primary), background: var(--surface)\\n- Font: monospace (system mono stack), sizes 10px-12px for UI text\\n- Borders: 1px solid var(--border), border-radius 4-6px\\n- Buttons: bg var(--accent) with black text, disabled opacity 0.4\\n- Spacing: 4px/8px/12px increments (Tailwind-compatible)\\n- Never use hardcoded hex colors — always reference CSS variables\\n- Element visibility: always set explicit display values (e.g. style.display = 'block', 'flex', 'grid') when showing hidden elements — never use style.display = '' because a CSS stylesheet display:none will persist\\n\\nCDN Libraries (OFFLINE-CAPABLE):\\nPlugins can load external libraries via the aide-cdn:// protocol, which caches files locally for offline use.\\nUsage: <script src=\\"aide-cdn://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js\\"></script>\\nURL format: aide-cdn://{cdn-hostname}/{path} — maps to https://{cdn-hostname}/{path}\\nSupported hosts: cdn.jsdelivr.net, unpkg.com, cdnjs.cloudflare.com, esm.sh, or any HTTPS CDN.\\nFirst load requires network; subsequent loads work fully offline from ~/.aide/cdn-cache/.\\nALWAYS pin versions (e.g. chart.js@4.4.1, not chart.js@latest) — cache is keyed by exact URL path.\\nCommon examples:\\n  Chart.js: aide-cdn://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js\\n  D3: aide-cdn://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js\\n  Three.js: aide-cdn://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js\\n  Marked: aide-cdn://cdn.jsdelivr.net/npm/marked@15.0.0/marked.min.js\\n  Tailwind CSS: aide-cdn://cdn.jsdelivr.net/npm/@tailwindcss/browser@4/cdn.min.js\\nNEVER use raw https:// URLs — they are blocked by the plugin sandbox. ALWAYS use aide-cdn:// prefix (e.g. style.display = 'block', 'flex', 'grid') when showing hidden elements — never use style.display = '' because a CSS stylesheet display:none will persist", inputSchema: { type: "object", properties: { name: { type: "string", description: "Plugin name (lowercase, hyphens)" }, description: { type: "string", description: "What the plugin does" }, code: { type: "string", description: "Complete plugin source code (CommonJS module)" }, permissions: { type: "array", items: { type: "string" }, description: "Required permissions: fs:read, fs:write, network, process" }, tools: { type: "array", description: "Tool definitions the plugin exposes", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } }, html: { type: "string", description: "Optional custom index.html for the plugin iframe UI. If omitted, a default UI is auto-generated with the window.aide shim (on, invoke, emit, theme). Custom HTML MUST include the shim manually — see auto-generated HTML for reference." }, scope: { type: "string", enum: ["global", "local"], description: "Where to install: global (~/.aide/plugins) or local ({workspace}/.aide/plugins). Default: local" } }, required: ["name", "description", "code"] } },
    { name: "aide_list_plugins", description: "List all installed AIDE plugins with their tools.", inputSchema: { type: "object", properties: {} } },
    { name: "aide_invoke_tool", description: "Invoke a tool from an installed AIDE plugin.", inputSchema: { type: "object", properties: { plugin_name: { type: "string" }, tool_name: { type: "string" }, args: { type: "object" } }, required: ["plugin_name", "tool_name"] } },
    { name: "aide_edit_plugin", description: "Edit an existing AIDE plugin in-place. Only provided fields are updated — omitted fields are left unchanged. Useful for patching code or UI without deleting and recreating the plugin.", inputSchema: { type: "object", properties: { name: { type: "string", description: "Plugin name to edit" }, code: { type: "string", description: "New index.js source (CommonJS module). Replaces existing code." }, html: { type: "string", description: "New index.html content. Replaces existing UI. Must include window.aide shim (on, invoke, emit, theme) if using event or tool APIs." }, description: { type: "string", description: "Updated plugin description." }, permissions: { type: "array", items: { type: "string" }, description: "Updated permissions list." }, tools: { type: "array", description: "Updated tool definitions.", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } } }, required: ["name"] } },
    { name: "aide_delete_plugin", description: "Delete an installed AIDE plugin.", inputSchema: { type: "object", properties: { plugin_name: { type: "string" }, scope: { type: "string", enum: ["global", "local"], description: "Which scope to delete from. Default: local" } }, required: ["plugin_name"] } }
  ];
  const plugins = listPluginSpecs();
  const dynamic = plugins.flatMap(function(p) {
    return p.tools.map(function(t) {
      return { name: "plugin_" + p.name + "_" + t.name, description: "[Plugin: " + p.name + "] " + t.description, inputSchema: { type: "object", properties: Object.fromEntries(Object.entries(t.parameters).map(function(e) { return [e[0], { type: e[1].type }]; })), required: Object.entries(t.parameters).filter(function(e) { return e[1].required; }).map(function(e) { return e[0]; }) } };
    });
  });
  return builtins.concat(dynamic);
}

function handleRequest(method, id, params) {
  try {
    if (method === "initialize") {
      sendResult(id, { protocolVersion: params.protocolVersion || "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "aide", version: "0.1.0" } });
    } else if (method === "tools/list") {
      sendResult(id, { tools: getBuiltinTools() });
    } else if (method === "tools/call") {
      const tn = params.name, ta = params.arguments || {};
      if (tn === "aide_create_plugin") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(createPlugin(ta), null, 2) }] }); }
      else if (tn === "aide_list_plugins") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(listPluginSpecs(), null, 2) }] }); }
      else if (tn === "aide_invoke_tool") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(invokePluginTool(ta.plugin_name, ta.tool_name, ta.args || {})) }] }); }
      else if (tn === "aide_edit_plugin") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(editPlugin(ta), null, 2) }] }); }
      else if (tn === "aide_delete_plugin") {
        const scope = ta.scope || "local";
        const baseDir = scope === "global" ? GLOBAL_PLUGINS_DIR : PLUGINS_DIR;
        if (!baseDir) throw new Error("Plugins directory not configured for scope: " + scope);
        const dir = path.join(baseDir, ta.plugin_name);
        if (!path.resolve(dir).startsWith(path.resolve(baseDir) + path.sep)) throw new Error("Invalid plugin name");
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
        sendResult(id, { content: [{ type: "text", text: "Deleted plugin: " + ta.plugin_name }] });
      } else if (tn.startsWith("plugin_")) {
        const rest = tn.replace("plugin_", "").split("_"); const pn = rest[0]; const tnn = rest.slice(1).join("_");
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(invokePluginTool(pn, tnn, ta)) }] });
      } else { sendError(id, -32601, "Unknown tool: " + tn); }
    } else if (!method.startsWith("notifications/")) {
      sendError(id, -32601, "Method not found: " + method);
    }
  } catch (err) { sendError(id, -32000, err.message); }
}

let buffer = "";
function processBuffer() {
  let newline;
  while ((newline = buffer.indexOf("\\n")) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try { const msg = JSON.parse(line); if (msg.method) handleRequest(msg.method, msg.id, msg.params); } catch {}
  }
}
process.stdin.setEncoding("utf-8");
process.stdin.on("data", function(chunk) { buffer += chunk; processBuffer(); });
process.stdin.on("end", function() { process.exit(0); });
`;

  fs.writeFileSync(getMcpServerPath(), script, { mode: 0o755 });
}
