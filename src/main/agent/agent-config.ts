/**
 * Agent-specific configuration for pty spawn optimization.
 * Each agent defines its command, args, extra env vars, and prompt patterns.
 */

export type AgentType = 'claude' | 'gemini' | 'codex' | 'shell';

export interface AgentSpawnConfig {
  /** The executable command */
  command: string;
  /** Default args passed to the command */
  args: string[];
  /** Additional environment variables to merge for this agent */
  extraEnv: Record<string, string>;
  /** Regex pattern that matches the agent's idle prompt */
  promptPattern: RegExp;
}

/** Common env vars applied to all agents */
export const COMMON_ENV: Record<string, string> = {
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
  FORCE_COLOR: '1',
  TERM_PROGRAM: 'AIDE',
};

/** Returns process.env entries whose keys start with the given prefix */
function pickEnvByPrefix(prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix) && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function getAgentSpawnConfig(agentType: AgentType, defaultShell: string, mcpConfigPath?: string): AgentSpawnConfig {
  switch (agentType) {
    case 'claude':
      return {
        command: 'claude',
        args: mcpConfigPath ? ['--mcp-config', mcpConfigPath] : [],
        extraEnv: pickEnvByPrefix('ANTHROPIC_'),
        promptPattern: /[❯>]\s*$/,
      };
    case 'gemini':
      // MCP registered globally via ~/.gemini/settings.json (no --mcp-config flag support)
      return {
        command: 'gemini',
        args: [],
        extraEnv: pickEnvByPrefix('GOOGLE_'),
        promptPattern: />\s*$/,
      };
    case 'codex':
      // MCP registered globally via ~/.codex/config.toml (no --mcp-config flag support)
      return {
        command: 'codex',
        args: [],
        extraEnv: pickEnvByPrefix('OPENAI_'),
        promptPattern: />\s*$/,
      };
    case 'shell':
    default:
      return {
        command: defaultShell,
        args: [],
        extraEnv: {},
        promptPattern: /[$%#]\s*$/,
      };
  }
}
