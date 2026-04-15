#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const GLOBAL_PLUGINS_DIR = process.env.AIDE_GLOBAL_PLUGINS_DIR || "";
function safeCwd() {
  // process.cwd() throws EPERM in packaged Electron apps when launched from Finder
  // (HOME=/ or unmounted cwd). Fall back to HOME / getpwuid / /tmp.
  try { return process.cwd(); } catch { /* EPERM uv_cwd */ }
  if (process.env.HOME && process.env.HOME !== "/") return process.env.HOME;
  try { return require("os").userInfo().homedir; } catch { /* ignore */ }
  return "/tmp";
}
const PLUGINS_DIR = process.env.AIDE_PLUGINS_DIR || path.join(safeCwd(), ".aide", "plugins");
const WORKSPACE = process.env.AIDE_WORKSPACE || safeCwd();

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
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

// Fix #1: Read spec.entryPoint instead of hardcoding "src/index.js"
function resolvePluginDir(pluginName) {
  if (PLUGINS_DIR) {
    const localDir = path.join(PLUGINS_DIR, pluginName);
    if (path.resolve(localDir).startsWith(path.resolve(PLUGINS_DIR) + path.sep)) {
      const specPath = path.join(localDir, "plugin.spec.json");
      if (fs.existsSync(specPath)) {
        try {
          const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
          const entryPoint = spec.entryPoint || "src/index.js";
          if (fs.existsSync(path.join(localDir, entryPoint))) {
            return { dir: localDir, base: PLUGINS_DIR, entryPoint };
          }
        } catch {}
      }
    }
  }
  if (GLOBAL_PLUGINS_DIR) {
    const globalDir = path.join(GLOBAL_PLUGINS_DIR, pluginName);
    if (path.resolve(globalDir).startsWith(path.resolve(GLOBAL_PLUGINS_DIR) + path.sep)) {
      const specPath = path.join(globalDir, "plugin.spec.json");
      if (fs.existsSync(specPath)) {
        try {
          const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
          const entryPoint = spec.entryPoint || "src/index.js";
          if (fs.existsSync(path.join(globalDir, entryPoint))) {
            return { dir: globalDir, base: GLOBAL_PLUGINS_DIR, entryPoint };
          }
        } catch {}
      }
    }
  }
  return null;
}

function invokePluginTool(pluginName, toolName, args) {
  const resolved = resolvePluginDir(pluginName);
  if (!resolved) throw new Error("Plugin not found: " + pluginName);
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
  // Fix #1 (cont): Use resolved.entryPoint, not hardcoded "src/index.js"
  const entryPath = path.join(resolved.dir, resolved.entryPoint);
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
  const scope = params.scope;
  if (!scope) throw new Error("scope is required. Ask the user whether they want the plugin installed globally (~/.aide/plugins, shared across all workspaces) or locally ({workspace}/.aide/plugins, only in the current project) before calling this tool.");
  const baseDir = scope === "global" ? GLOBAL_PLUGINS_DIR : PLUGINS_DIR;
  if (!baseDir) throw new Error(scope === "global" ? "AIDE_GLOBAL_PLUGINS_DIR not set" : "AIDE_PLUGINS_DIR not set");
  const safeName = params.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const pluginDir = path.join(baseDir, safeName);
  if (!path.resolve(pluginDir).startsWith(path.resolve(baseDir))) throw new Error("Invalid plugin name");
  const id = "plugin-" + crypto.randomUUID().slice(0, 8);
  const tools = params.tools || [{ name: safeName + "-run", description: "Execute " + params.name, parameters: { input: { type: "string", required: true } } }];
  const spec = {
    id,
    name: safeName,
    description: params.description,
    version: "0.1.0",
    permissions: params.permissions || ["fs:read"],
    entryPoint: "src/index.js",
    tools,
    // Fix #3: persist fileAssociations in spec
    fileAssociations: params.fileAssociations || []
  };
  fs.mkdirSync(path.join(pluginDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "mcp"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "skill"), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, "plugin.spec.json"), JSON.stringify(spec, null, 2));
  fs.writeFileSync(path.join(pluginDir, "tool.json"), JSON.stringify({ pluginId: id, pluginName: safeName, version: "0.1.0", tools }, null, 2));
  fs.writeFileSync(path.join(pluginDir, "src", "index.js"), params.code);
  // Fix #5: Remove redundant inline shim — protocol.ts auto-injects window.aide into all iframes
  const indexHtml = params.html ? params.html : (
    '<!DOCTYPE html>' +
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
    '</style></head><body>' +
    '<div id="root" style="padding:12px;">' +
    '<p style="color:var(--text-secondary)">Plugin: ' + safeName + '</p>' +
    '<p style="color:var(--text-tertiary);font-size:10px;">' + (params.description || '') + '</p>' +
    '</div></body></html>'
  );
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
  if (params.description !== undefined) spec.description = params.description;
  if (params.permissions !== undefined) spec.permissions = params.permissions;
  // Fix #3: support fileAssociations in editPlugin
  if (params.fileAssociations !== undefined) spec.fileAssociations = params.fileAssociations;
  if (params.tools !== undefined) {
    spec.tools = params.tools;
    fs.writeFileSync(path.join(pluginDir, "tool.json"), JSON.stringify({ pluginId: spec.id, pluginName: spec.name, version: spec.version, tools: params.tools }, null, 2));
  }
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  if (params.code !== undefined) {
    try { vm.compileFunction(params.code, [], { filename: "index.js" }); } catch (err) {
      throw new Error("Plugin code compilation failed: " + err.message);
    }
    // Fix #1 (cont): write to spec.entryPoint, not hardcoded "src/index.js"
    fs.writeFileSync(path.join(pluginDir, resolved.entryPoint), params.code);
  }
  if (params.html !== undefined) fs.writeFileSync(path.join(pluginDir, "index.html"), params.html);
  return spec;
}

// Fix #4: corrected description (removed copy-paste error at end of CDN section)
// Fix #5: updated shim docs (auto-injected, no manual inclusion needed)
// Fix #3: added fileAssociations to inputSchemas
// Fix #6: scope required in aide_delete_plugin
const CREATE_PLUGIN_DESC = `IMPORTANT: Before calling this tool, you MUST ask the user whether they want the plugin installed globally (~/.aide/plugins, shared across all workspaces) or locally ({workspace}/.aide/plugins, only in the current project). Do not assume a default — always wait for the user's explicit answer.

Create a new AIDE plugin from code. The code must be a CommonJS module exporting { name, version, tools, invoke(toolName, args) }.

Sandbox Environment:
- require('path') → always available
- require('fs') → scoped to workspace directory (requires fs:read or fs:write permission). Available methods: existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync. All paths resolved relative to workspace root.
- require('fs') needs plugin permissions: fs:read for read operations, fs:write for write operations
- Buffer global available
- console.log/error/warn available
- aide.fs → same scoped fs object. Methods: read(path), write(path,content), existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync
- aide.files.reveal(path) / aide.files.select(path) / aide.files.refresh() → control the FILES tab (no-op in MCP context, functional in Electron UI)
- aide.plugins.emit(event, data) → broadcast event to other plugins (no-op in MCP context)
- No network access, no child_process, no other Node.js modules
- An index.html is auto-generated for iframe rendering. Pass the optional 'html' parameter to aide_create_plugin to provide a custom UI in one step.

HTML UI (iframe) Event API:
Plugin iframes receive FILES tab events via postMessage from the AIDE renderer.

Constraints (sandbox="allow-scripts", no allow-same-origin):
- file:// URLs are BLOCKED inside the iframe. Never set frame.src = 'file://' + path.
- To display file content, use window.aide.invoke() to call a backend tool, then render with a blob URL.
- data.filePath is an absolute OS path (e.g. /Users/alice/project/src/main.ts on macOS).

Available iframe APIs:
  window.aide.on(event, cb) — listen for file events (file:clicked, file:right-clicked)
  window.aide.invoke(plugin, tool, args) — call a plugin backend tool, returns a Promise
  window.aide.emit() — reserved for future use

window.aide shim:
AIDE automatically injects the window.aide shim into all plugin iframes — both auto-generated and custom HTML. You do NOT need to include the shim manually in custom HTML.

Events fire on every file click — eventBindings are NOT required for iframe postMessage:
  window.aide.on('file:clicked', function(data) { /* data.filePath — absolute path */ })
  window.aide.on('file:right-clicked', function(data) { /* data.filePath */ })

Invoking backend tools from iframe:
  window.aide.invoke('my-plugin', 'get_html_content', { filePath: data.filePath })
    .then(function(content) {
      var blob = new Blob([content], { type: 'text/html' });
      document.getElementById('preview').src = URL.createObjectURL(blob);
    });

eventBindings (.aide/settings.json): controls backend tool invocation on file events only — separate from iframe postMessage.
  Example: { "eventBindings": { "file:clicked": [{ "plugin": "my-plugin", "tool": "on-file-clicked", "args": {} }] } }

IMPORTANT — AIDE Design System Rules:
If the plugin produces UI output (HTML/CSS), it MUST use these CSS custom properties (not hardcoded colors):

Dark theme (default):
  --background: #131519, --surface: #1A1C23, --surface-elevated: #24262E
  --border: #2E3140, --text-primary: #E8E9ED, --text-secondary: #8B8D98
  --text-tertiary: #5C5E6A, --accent: #10B981 (emerald green)
  --accent-warning: #F59E0B, --accent-info: #06B6D4
  --scrollbar-thumb: rgba(255,255,255,0.08), --scrollbar-thumb-hover: rgba(255,255,255,0.16)
  --agent-claude: #D97706 (amber), --agent-gemini: #3B82F6 (blue), --agent-codex: #10B981 (green)

Light theme (.light class on root):
  --background: #F5F5F0, --surface: #FAFAF7, --surface-elevated: #EBEBE6
  --border: #E0E3E8, --text-primary: #0D0D0D, --text-secondary: #6B7280
  --text-tertiary: #9CA3AF, --accent: #059669
  --scrollbar-thumb: rgba(0,0,0,0.12), --scrollbar-thumb-hover: rgba(0,0,0,0.22)

Style rules:
- Use CSS var() references: color: var(--text-primary), background: var(--surface)
- Font: monospace (system mono stack), sizes 10px-12px for UI text
- Borders: 1px solid var(--border), border-radius 4-6px
- Buttons: bg var(--accent) with black text, disabled opacity 0.4
- Spacing: 4px/8px/12px increments (Tailwind-compatible)
- Never use hardcoded hex colors — always reference CSS variables
- Element visibility: always set explicit display values (e.g. style.display = 'block', 'flex', 'grid') when showing hidden elements — never use style.display = '' because a CSS stylesheet display:none will persist

CDN Libraries (OFFLINE-CAPABLE):
Plugins can load external libraries via the aide-cdn:// protocol, which caches files locally for offline use.
Usage: <script src="aide-cdn://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>
URL format: aide-cdn://{cdn-hostname}/{path} — maps to https://{cdn-hostname}/{path}
Supported hosts: cdn.jsdelivr.net, unpkg.com, cdnjs.cloudflare.com, esm.sh, or any HTTPS CDN.
First load requires network; subsequent loads work fully offline from ~/.aide/cdn-cache/.
ALWAYS pin versions (e.g. chart.js@4.4.1, not chart.js@latest) — cache is keyed by exact URL path.
Common examples:
  Chart.js: aide-cdn://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js
  D3: aide-cdn://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
  Three.js: aide-cdn://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js
  Marked: aide-cdn://cdn.jsdelivr.net/npm/marked@15.0.0/marked.min.js
  Tailwind CSS: aide-cdn://cdn.jsdelivr.net/npm/@tailwindcss/browser@4/cdn.min.js
NEVER use raw https:// URLs — they are blocked by the plugin sandbox. ALWAYS use aide-cdn:// prefix.`;

function getBuiltinTools() {
  const builtins = [
    {
      name: "aide_create_plugin",
      description: CREATE_PLUGIN_DESC,
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Plugin name (lowercase, hyphens)" },
          description: { type: "string", description: "What the plugin does" },
          code: { type: "string", description: "Complete plugin source code (CommonJS module)" },
          permissions: { type: "array", items: { type: "string" }, description: "Required permissions: fs:read, fs:write, network, process" },
          tools: { type: "array", description: "Tool definitions the plugin exposes", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } },
          html: { type: "string", description: "Optional custom index.html for the plugin iframe UI. If omitted, a default UI is auto-generated. The window.aide shim (on, invoke, emit, theme) is automatically injected by AIDE into all iframes — you do not need to include it manually." },
          scope: { type: "string", enum: ["global", "local"], description: "Where to install: global (~/.aide/plugins, shared across all workspaces) or local ({workspace}/.aide/plugins, only in the current project). Must be explicitly chosen by the user." },
          fileAssociations: { type: "array", items: { type: "string" }, description: "File extensions or glob patterns this plugin handles (e.g. [\".html\", \".css\", \"*.json\"]). Used to associate the plugin with file types in the file tree." }
        },
        required: ["name", "description", "code", "scope"]
      }
    },
    {
      name: "aide_list_plugins",
      description: "List all installed AIDE plugins with their tools.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "aide_invoke_tool",
      description: "Invoke a tool from an installed AIDE plugin.",
      inputSchema: { type: "object", properties: { plugin_name: { type: "string" }, tool_name: { type: "string" }, args: { type: "object" } }, required: ["plugin_name", "tool_name"] }
    },
    {
      name: "aide_edit_plugin",
      description: "Edit an existing AIDE plugin in-place. Only provided fields are updated — omitted fields are left unchanged. Useful for patching code or UI without deleting and recreating the plugin.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Plugin name to edit" },
          code: { type: "string", description: "New index.js source (CommonJS module). Replaces existing code." },
          html: { type: "string", description: "New index.html content. Replaces existing UI. The window.aide shim is automatically injected by AIDE — no manual inclusion needed." },
          description: { type: "string", description: "Updated plugin description." },
          permissions: { type: "array", items: { type: "string" }, description: "Updated permissions list." },
          tools: { type: "array", description: "Updated tool definitions.", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } },
          fileAssociations: { type: "array", items: { type: "string" }, description: "Updated file associations (extensions or glob patterns)." }
        },
        required: ["name"]
      }
    },
    {
      // Fix #6: scope is now required (consistent with aide_create_plugin)
      name: "aide_delete_plugin",
      description: "Delete an installed AIDE plugin.",
      inputSchema: {
        type: "object",
        properties: {
          plugin_name: { type: "string" },
          scope: { type: "string", enum: ["global", "local"], description: "Which scope to delete from: global (~/.aide/plugins) or local ({workspace}/.aide/plugins)." }
        },
        required: ["plugin_name", "scope"]
      }
    }
  ];

  const plugins = listPluginSpecs();
  const dynamic = plugins.flatMap(function(p) {
    return p.tools.map(function(t) {
      return {
        name: "plugin_" + p.name + "_" + t.name,
        description: "[Plugin: " + p.name + "] " + t.description,
        inputSchema: {
          type: "object",
          properties: Object.fromEntries(Object.entries(t.parameters).map(function(e) { return [e[0], { type: e[1].type }]; })),
          required: Object.entries(t.parameters).filter(function(e) { return e[1].required; }).map(function(e) { return e[0]; })
        }
      };
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
      if (tn === "aide_create_plugin") {
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(createPlugin(ta), null, 2) }] });
      } else if (tn === "aide_list_plugins") {
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(listPluginSpecs(), null, 2) }] });
      } else if (tn === "aide_invoke_tool") {
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(invokePluginTool(ta.plugin_name, ta.tool_name, ta.args || {})) }] });
      } else if (tn === "aide_edit_plugin") {
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(editPlugin(ta), null, 2) }] });
      } else if (tn === "aide_delete_plugin") {
        // Fix #6: scope is required — no default fallback
        const scope = ta.scope;
        if (!scope) throw new Error("scope is required: 'global' or 'local'");
        const baseDir = scope === "global" ? GLOBAL_PLUGINS_DIR : PLUGINS_DIR;
        if (!baseDir) throw new Error("Plugins directory not configured for scope: " + scope);
        const dir = path.join(baseDir, ta.plugin_name);
        if (!path.resolve(dir).startsWith(path.resolve(baseDir) + path.sep)) throw new Error("Invalid plugin name");
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
        sendResult(id, { content: [{ type: "text", text: "Deleted plugin: " + ta.plugin_name }] });
      } else if (tn.startsWith("plugin_")) {
        // Fix #2: match against known plugin names to handle underscores correctly
        const allPlugins = listPluginSpecs();
        let pluginName = null, toolName = null;
        for (const p of allPlugins) {
          const prefix = "plugin_" + p.name + "_";
          if (tn.startsWith(prefix)) {
            pluginName = p.name;
            toolName = tn.slice(prefix.length);
            break;
          }
        }
        if (!pluginName) { sendError(id, -32601, "Unknown tool: " + tn); return; }
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(invokePluginTool(pluginName, toolName, ta)) }] });
      } else {
        sendError(id, -32601, "Unknown tool: " + tn);
      }
    } else if (!method.startsWith("notifications/")) {
      sendError(id, -32601, "Method not found: " + method);
    }
  } catch (err) { sendError(id, -32000, err.message); }
}

let buffer = "";
function processBuffer() {
  let newline;
  while ((newline = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try { const msg = JSON.parse(line); if (msg.method) handleRequest(msg.method, msg.id, msg.params); } catch {}
  }
}
process.stdin.setEncoding("utf-8");
process.stdin.on("data", function(chunk) { buffer += chunk; processBuffer(); });
process.stdin.on("end", function() { process.exit(0); });
