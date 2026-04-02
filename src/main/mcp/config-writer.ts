/**
 * Writes the AIDE MCP server script and config to userData at startup.
 * The server runs as a standalone Node.js process — agents connect via --mcp-config.
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

/** Reliable home directory — getHome() returns '/' when Finder launches without HOME */
function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  try { return os.userInfo().homedir; } catch { /* ignore */ }
  return app.getPath('home');
}

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
 * Registers the AIDE MCP server in ~/.claude.json so Claude CLI always finds it.
 * Safe to call multiple times — merges rather than overwrites.
 */
function registerClaudeGlobalMcp(): void {
  const home = getHome();
  const claudeConfigPath = path.join(home, '.claude.json');
  const globalPluginsDir = path.join(home, '.aide', 'plugins');

  let config: Record<string, unknown> = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'));
    } catch {
      // Corrupt file — start fresh
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }
  (config.mcpServers as Record<string, unknown>)['aide'] = {
    command: resolveNodePath(),
    args: [getMcpServerPath()],
    env: {
      AIDE_GLOBAL_PLUGINS_DIR: globalPluginsDir,
    },
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
}

export function writeMcpConfig(workspacePath: string): string {
  const globalPluginsDir = path.join(getHome(), '.aide', 'plugins');
  const localPluginsDir = path.join(workspacePath, '.aide', 'plugins');

  fs.mkdirSync(globalPluginsDir, { recursive: true });
  fs.mkdirSync(localPluginsDir, { recursive: true });

  writeMcpServerScript();
  registerClaudeGlobalMcp();

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
  const entryPath = path.join(resolved.dir, "src", "index.js");
  const code = fs.readFileSync(entryPath, "utf-8");
  const sandbox = {
    module: { exports: {} }, exports: {},
    require: function() { throw new Error("require() not allowed"); },
    console: { log: function(){}, error: function(){}, warn: function(){} },
    aide: {
      fs: {
        read: function(fp) {
          const abs = path.resolve(WORKSPACE, fp);
          if (!abs.startsWith(WORKSPACE)) throw new Error("Access denied");
          return fs.readFileSync(abs, "utf-8");
        },
        write: function(fp, content) {
          const abs = path.resolve(WORKSPACE, fp);
          if (!abs.startsWith(WORKSPACE)) throw new Error("Access denied");
          fs.writeFileSync(abs, content);
        }
      },
      plugin: { id: pluginName, name: pluginName, version: "0.1.0" }
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
  const indexHtml = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><style>' +
    ':root{--background:#131519;--surface:#1A1C23;--surface-elevated:#24262E;--border:#2E3140;--text-primary:#E8E9ED;--text-secondary:#8B8D98;--text-tertiary:#5C5E6A;--accent:#10B981;--accent-warning:#F59E0B;--accent-info:#06B6D4}' +
    '.light{--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669}' +
    '@media(prefers-color-scheme:light){:root:not(.dark){--background:#F5F5F0;--surface:#FAFAF7;--surface-elevated:#EBEBE6;--border:#E0E3E8;--text-primary:#0D0D0D;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--accent:#059669}}' +
    'body{margin:0;font-family:monospace;font-size:12px;background:var(--background);color:var(--text-primary)}' +
    '</style><script>window.addEventListener("message",function(e){if(e.data&&e.data.theme){document.documentElement.className=e.data.theme}});</script></head><body>' +
    '<div id="root" style="padding:12px;">' +
    '<p style="color:var(--text-secondary)">Plugin: ' + safeName + '</p>' +
    '<p style="color:var(--text-tertiary);font-size:10px;">' + (params.description || '') + '</p>' +
    '</div></body></html>';
  fs.writeFileSync(path.join(pluginDir, "index.html"), indexHtml);
  try { vm.compileFunction(params.code, [], { filename: "index.js" }); } catch (err) {
    fs.rmSync(pluginDir, { recursive: true });
    throw new Error("Plugin code compilation failed: " + err.message);
  }
  return spec;
}

function getBuiltinTools() {
  const builtins = [
    { name: "aide_create_plugin", description: "Create a new AIDE plugin from code. The code must be a CommonJS module exporting { name, version, tools, invoke(toolName, args) }.\\n\\nSandbox Environment:\\n- require('path') → always available\\n- require('fs') → scoped to workspace directory. Available methods: existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync. All paths relative to workspace.\\n- require('fs') needs plugin permissions: fs:read for read operations, fs:write for write operations\\n- Buffer global available\\n- console.log/error/warn available (prefixed with plugin name)\\n- aide.fs.read(path)/aide.fs.write(path, content) also available\\n- No network access, no child_process, no other Node.js modules\\n- An index.html is auto-generated for iframe rendering. Override it by including an index.html in your plugin code if custom UI is needed.\\n\\nIMPORTANT — AIDE Design System Rules:\\nIf the plugin produces UI output (HTML/CSS), it MUST use these CSS custom properties (not hardcoded colors):\\n\\nDark theme (default):\\n  --background: #131519, --surface: #1A1C23, --surface-elevated: #24262E\\n  --border: #2E3140, --text-primary: #E8E9ED, --text-secondary: #8B8D98\\n  --text-tertiary: #5C5E6A, --accent: #10B981 (emerald green)\\n  --accent-warning: #F59E0B, --accent-info: #06B6D4\\n  --agent-claude: #D97706 (amber), --agent-gemini: #3B82F6 (blue), --agent-codex: #10B981 (green)\\n\\nLight theme (.light class on root):\\n  --background: #F5F5F0, --surface: #FAFAF7, --surface-elevated: #EBEBE6\\n  --border: #E0E3E8, --text-primary: #0D0D0D, --text-secondary: #6B7280\\n  --text-tertiary: #9CA3AF, --accent: #059669\\n\\nStyle rules:\\n- Use CSS var() references: color: var(--text-primary), background: var(--surface)\\n- Font: monospace (system mono stack), sizes 10px-12px for UI text\\n- Borders: 1px solid var(--border), border-radius 4-6px\\n- Buttons: bg var(--accent) with black text, disabled opacity 0.4\\n- Spacing: 4px/8px/12px increments (Tailwind-compatible)\\n- Never use hardcoded hex colors — always reference CSS variables", inputSchema: { type: "object", properties: { name: { type: "string", description: "Plugin name (lowercase, hyphens)" }, description: { type: "string", description: "What the plugin does" }, code: { type: "string", description: "Complete plugin source code (CommonJS module)" }, permissions: { type: "array", items: { type: "string" }, description: "Required permissions: fs:read, fs:write, network, process" }, tools: { type: "array", description: "Tool definitions the plugin exposes", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } }, scope: { type: "string", enum: ["global", "local"], description: "Where to install: global (~/.aide/plugins) or local ({workspace}/.aide/plugins). Default: local" } }, required: ["name", "description", "code"] } },
    { name: "aide_list_plugins", description: "List all installed AIDE plugins with their tools.", inputSchema: { type: "object", properties: {} } },
    { name: "aide_invoke_tool", description: "Invoke a tool from an installed AIDE plugin.", inputSchema: { type: "object", properties: { plugin_name: { type: "string" }, tool_name: { type: "string" }, args: { type: "object" } }, required: ["plugin_name", "tool_name"] } },
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
