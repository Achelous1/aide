/**
 * Writes the AIDE MCP server script and config to userData at startup.
 * The server runs as a standalone Node.js process — agents connect via --mcp-config.
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const USER_DATA = app.getPath('userData');
const MCP_SERVER_PATH = path.join(USER_DATA, 'aide-mcp-server.js');
const MCP_CONFIG_PATH = path.join(USER_DATA, 'mcp-config.json');
const PLUGINS_DIR = path.join(USER_DATA, 'plugins');

export function getMcpConfigPath(): string {
  return MCP_CONFIG_PATH;
}

export function getMcpServerPath(): string {
  return MCP_SERVER_PATH;
}

export function writeMcpConfig(workspacePath: string): string {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  writeMcpServerScript();

  const config = {
    mcpServers: {
      aide: {
        command: 'node',
        args: [MCP_SERVER_PATH],
        env: {
          AIDE_PLUGINS_DIR: PLUGINS_DIR,
          AIDE_WORKSPACE: workspacePath,
        },
      },
    },
  };

  fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
  return MCP_CONFIG_PATH;
}

function writeMcpServerScript(): void {
  // Embedded MCP server — self-contained, no external dependencies
  const script = `#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const PLUGINS_DIR = process.env.AIDE_PLUGINS_DIR || "";
const WORKSPACE = process.env.AIDE_WORKSPACE || process.cwd();

function send(msg) {
  const json = JSON.stringify(msg);
  process.stdout.write("Content-Length: " + Buffer.byteLength(json) + "\\r\\n\\r\\n" + json);
}
function sendResult(id, result) { send({ jsonrpc: "2.0", id, result }); }
function sendError(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

function listPluginSpecs() {
  if (!PLUGINS_DIR || !fs.existsSync(PLUGINS_DIR)) return [];
  const specs = [];
  for (const entry of fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(PLUGINS_DIR, entry.name, "plugin.spec.json");
    if (!fs.existsSync(specPath)) continue;
    try { specs.push(JSON.parse(fs.readFileSync(specPath, "utf-8"))); } catch {}
  }
  return specs;
}

function invokePluginTool(pluginName, toolName, args) {
  const pluginDir = path.join(PLUGINS_DIR, pluginName);
  const resolved = path.resolve(pluginDir);
  if (!resolved.startsWith(path.resolve(PLUGINS_DIR) + path.sep)) throw new Error("Invalid plugin name");
  const entryPath = path.join(pluginDir, "index.js");
  if (!fs.existsSync(entryPath)) throw new Error("Plugin not found: " + pluginName);
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
  if (!PLUGINS_DIR) throw new Error("AIDE_PLUGINS_DIR not set");
  const safeName = params.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const pluginDir = path.join(PLUGINS_DIR, safeName);
  if (!path.resolve(pluginDir).startsWith(path.resolve(PLUGINS_DIR))) throw new Error("Invalid plugin name");
  const id = "plugin-" + crypto.randomUUID().slice(0, 8);
  const tools = params.tools || [{ name: safeName + "-run", description: "Execute " + params.name, parameters: { input: { type: "string", required: true } } }];
  const spec = { id, name: safeName, description: params.description, version: "0.1.0", permissions: params.permissions || ["fs:read"], entryPoint: "index.js", tools };
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, "plugin.spec.json"), JSON.stringify(spec, null, 2));
  fs.writeFileSync(path.join(pluginDir, "tool.json"), JSON.stringify({ pluginId: id, pluginName: safeName, version: "0.1.0", tools }, null, 2));
  fs.writeFileSync(path.join(pluginDir, "index.js"), params.code);
  try { vm.compileFunction(params.code, [], { filename: "index.js" }); } catch (err) {
    fs.rmSync(pluginDir, { recursive: true });
    throw new Error("Plugin code compilation failed: " + err.message);
  }
  return spec;
}

function getBuiltinTools() {
  const builtins = [
    { name: "aide_create_plugin", description: "Create a new AIDE plugin from code. The code must be a CommonJS module exporting { name, version, tools, invoke(toolName, args) }.\\n\\nIMPORTANT — AIDE Design System Rules:\\nIf the plugin produces UI output (HTML/CSS), it MUST use these CSS custom properties (not hardcoded colors):\\n\\nDark theme (default):\\n  --background: #131519, --surface: #1A1C23, --surface-elevated: #24262E\\n  --border: #2E3140, --text-primary: #E8E9ED, --text-secondary: #8B8D98\\n  --text-tertiary: #5C5E6A, --accent: #10B981 (emerald green)\\n  --accent-warning: #F59E0B, --accent-info: #06B6D4\\n  --agent-claude: #D97706 (amber), --agent-gemini: #3B82F6 (blue), --agent-codex: #10B981 (green)\\n\\nLight theme (.light class on root):\\n  --background: #F5F5F0, --surface: #FAFAF7, --surface-elevated: #EBEBE6\\n  --border: #E0E3E8, --text-primary: #0D0D0D, --text-secondary: #6B7280\\n  --text-tertiary: #9CA3AF, --accent: #059669\\n\\nStyle rules:\\n- Use CSS var() references: color: var(--text-primary), background: var(--surface)\\n- Font: monospace (system mono stack), sizes 10px-12px for UI text\\n- Borders: 1px solid var(--border), border-radius 4-6px\\n- Buttons: bg var(--accent) with black text, disabled opacity 0.4\\n- Spacing: 4px/8px/12px increments (Tailwind-compatible)\\n- Never use hardcoded hex colors — always reference CSS variables", inputSchema: { type: "object", properties: { name: { type: "string", description: "Plugin name (lowercase, hyphens)" }, description: { type: "string", description: "What the plugin does" }, code: { type: "string", description: "Complete plugin source code (CommonJS module)" }, permissions: { type: "array", items: { type: "string" }, description: "Required permissions: fs:read, fs:write, network, process" }, tools: { type: "array", description: "Tool definitions the plugin exposes", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, parameters: { type: "object" } } } } }, required: ["name", "description", "code"] } },
    { name: "aide_list_plugins", description: "List all installed AIDE plugins with their tools.", inputSchema: { type: "object", properties: {} } },
    { name: "aide_invoke_tool", description: "Invoke a tool from an installed AIDE plugin.", inputSchema: { type: "object", properties: { plugin_name: { type: "string" }, tool_name: { type: "string" }, args: { type: "object" } }, required: ["plugin_name", "tool_name"] } },
    { name: "aide_delete_plugin", description: "Delete an installed AIDE plugin.", inputSchema: { type: "object", properties: { plugin_name: { type: "string" } }, required: ["plugin_name"] } }
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
      sendResult(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "aide", version: "0.1.0" } });
    } else if (method === "tools/list") {
      sendResult(id, { tools: getBuiltinTools() });
    } else if (method === "tools/call") {
      const tn = params.name, ta = params.arguments || {};
      if (tn === "aide_create_plugin") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(createPlugin(ta), null, 2) }] }); }
      else if (tn === "aide_list_plugins") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(listPluginSpecs(), null, 2) }] }); }
      else if (tn === "aide_invoke_tool") { sendResult(id, { content: [{ type: "text", text: JSON.stringify(invokePluginTool(ta.plugin_name, ta.tool_name, ta.args || {})) }] }); }
      else if (tn === "aide_delete_plugin") {
        const dir = path.join(PLUGINS_DIR, ta.plugin_name);
        if (!path.resolve(dir).startsWith(path.resolve(PLUGINS_DIR) + path.sep)) throw new Error("Invalid plugin name");
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
  while (true) {
    const headerEnd = buffer.indexOf("\\r\\n\\r\\n");
    if (headerEnd === -1) break;
    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\\s*(\\d+)/i);
    if (!match) { buffer = buffer.slice(headerEnd + 4); continue; }
    const len = parseInt(match[1], 10);
    const start = headerEnd + 4;
    if (buffer.length < start + len) break;
    const content = buffer.slice(start, start + len);
    buffer = buffer.slice(start + len);
    try { const msg = JSON.parse(content); if (msg.method) handleRequest(msg.method, msg.id, msg.params); } catch {}
  }
}
process.stdin.setEncoding("utf-8");
process.stdin.on("data", function(chunk) { buffer += chunk; processBuffer(); });
process.stdin.on("end", function() { process.exit(0); });
`;

  fs.writeFileSync(MCP_SERVER_PATH, script, { mode: 0o755 });
}
