/**
 * Writes the Smalti MCP server script and config to userData at startup.
 * The server runs as a standalone Node.js process — agents connect via --mcp-config.
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getHome } from '../utils/home';
// Fix #7: server script lives in src/main/mcp/server.js (readable JS, no escape hell)
import serverScript from './server.js?raw';

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
  // Use ~/.smalti/ instead of userData — userData path contains "Application Support"
  // which has a space that Claude Code CLI mishandles when spawning the MCP process.
  return path.join(getHome(), '.smalti', 'smalti-mcp-server.js');
}

/**
 * Shared helper: merges the Smalti MCP server entry into a JSON config file.
 * Safe to call multiple times — merges rather than overwrites.
 */
function registerJsonMcpConfig(configPath: string, nodePath: string, serverPath: string): void {
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
  const servers = config.mcpServers as Record<string, unknown>;
  // Migrate legacy 'aide' entry to 'smalti'
  if ('aide' in servers) {
    delete servers['aide'];
    console.error(`[smalti-mcp] migrated 'aide' entry to 'smalti' in ${configPath}`);
  }
  servers['smalti'] = {
    command: nodePath,
    args: [serverPath],
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Removes both mcpServers.smalti and mcpServers.aide entries from a JSON MCP config file.
 * Preserves other mcpServers and top-level keys. If mcpServers becomes
 * empty after removal, the key is dropped. If the file does not exist
 * or contains neither entry, this is a no-op.
 */
export function unregisterSmaltiFromJsonConfig(configPath: string): void {
  if (!fs.existsSync(configPath)) return;
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return; // corrupt — leave untouched
  }
  const servers = config.mcpServers as Record<string, unknown> | undefined;
  if (!servers || typeof servers !== 'object') return;
  if (!('aide' in servers) && !('smalti' in servers)) return;
  delete servers['aide'];
  delete servers['smalti'];
  if (Object.keys(servers).length === 0) {
    delete config.mcpServers;
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Removes the [mcp_servers.aide] section AND any sub-sections (e.g. [mcp_servers.aide.env])
 * from a TOML string (line-by-line, safe for array values).
 * Handles sub-sections that appear before or after the parent section header.
 */
function removeTomlSection(content: string, sectionHeader: string): string {
  const lines = content.split('\n');
  const sectionName = sectionHeader.slice(1, -1); // e.g. "mcp_servers.aide"
  const isInSectionGroup = (line: string): boolean => {
    const trimmed = line.trimEnd();
    return trimmed === sectionHeader || trimmed.startsWith(`[${sectionName}.`);
  };
  let inSection = false;
  return lines.filter((line) => {
    if (isInSectionGroup(line)) { inSection = true; return false; }
    if (inSection && line.startsWith('[')) inSection = false;
    return !inSection;
  }).join('\n');
}

export function writeMcpConfig(workspacePath: string): string {
  const home = getHome();
  const nodePath = resolveNodePath();
  const serverPath = getMcpServerPath();

  writeMcpServerScript();

  // Claude is launched with --mcp-config <path>, so ANY other config source
  // that lists "aide" causes Claude to spawn the MCP server once per source.
  // Strip legacy entries older versions of smalti wrote:
  //   1. ~/.claude.json (global Claude config)
  //   2. ~/.mcp.json    (HOME-level .mcp.json; Claude auto-discovers it by
  //                      walking up from cwd, and every workspace is under HOME,
  //                      so it's always picked up alongside --mcp-config)
  // Idempotent — safe to run on every workspace change.
  try {
    unregisterSmaltiFromJsonConfig(path.join(home, '.claude.json'));
  } catch (err) {
    console.warn('[smalti] Failed to clean legacy Claude MCP entry:', (err as Error).message);
  }
  try {
    unregisterSmaltiFromJsonConfig(path.join(home, '.mcp.json'));
  } catch (err) {
    console.warn('[smalti] Failed to clean legacy ~/.mcp.json entry:', (err as Error).message);
  }

  // Register in ~/.gemini/settings.json (Gemini has no --mcp-config flag)
  try {
    registerJsonMcpConfig(path.join(home, '.gemini', 'settings.json'), nodePath, serverPath);
  } catch (err) {
    console.warn('[smalti] Failed to register Gemini MCP config:', (err as Error).message);
  }

  // Register in ~/.codex/config.toml (Codex has no --mcp-config flag)
  try {
    const codexConfigPath = path.join(home, '.codex', 'config.toml');
    fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
    let content = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath, 'utf-8') : '';
    // Migrate legacy [mcp_servers.aide] section and write [mcp_servers.smalti]
    if (content.includes('[mcp_servers.aide]')) {
      content = removeTomlSection(content, '[mcp_servers.aide]');
      console.error(`[smalti-mcp] migrated 'aide' entry to 'smalti' in ${codexConfigPath}`);
    }
    content = removeTomlSection(content, '[mcp_servers.smalti]');
    const prefix = content.trimEnd();
    const block = `[mcp_servers.smalti]\ncommand = ${JSON.stringify(nodePath)}\nargs = [${JSON.stringify(serverPath)}]\n`;
    fs.writeFileSync(codexConfigPath, prefix.length > 0 ? `${prefix}\n\n${block}` : block);
  } catch (err) {
    console.warn('[smalti] Failed to register Codex MCP config:', (err as Error).message);
  }

  const config = {
    mcpServers: {
      smalti: {
        command: 'node',
        args: [getMcpServerPath()],
        env: {
          SMALTI_WORKSPACE: workspacePath,
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
  fs.writeFileSync(getMcpServerPath(), serverScript, { mode: 0o755 });
}

