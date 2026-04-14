/**
 * Writes the AIDE MCP server script and config to userData at startup.
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

  // Write project-level .mcp.json at workspace root so Claude Code CLI auto-detects
  // workspace-specific env vars (AIDE_WORKSPACE, AIDE_PLUGINS_DIR) when running in the project.
  try {
    const projectMcpPath = path.join(workspacePath, '.mcp.json');
    const projectConfig = {
      mcpServers: {
        aide: {
          command: nodePath,
          args: [serverPath],
          env: {
            AIDE_GLOBAL_PLUGINS_DIR: globalPluginsDir,
            AIDE_PLUGINS_DIR: localPluginsDir,
            AIDE_WORKSPACE: workspacePath,
          },
        },
      },
    };
    fs.writeFileSync(projectMcpPath, JSON.stringify(projectConfig, null, 2));
  } catch (err) {
    console.warn('[AIDE] Failed to write project .mcp.json:', (err as Error).message);
  }

  return mcpConfigPath;
}

function writeMcpServerScript(): void {
  fs.mkdirSync(path.dirname(getMcpServerPath()), { recursive: true });
  fs.writeFileSync(getMcpServerPath(), serverScript, { mode: 0o755 });
}

