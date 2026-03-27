import { create } from 'zustand';
import type { AgentConfig, AgentStatus, TerminalSpawnOptions } from '../../types/ipc';

/** Prompt patterns per agent type — used for idle state detection */
export const AGENT_PROMPT_PATTERNS: Record<NonNullable<TerminalSpawnOptions['agentType']>, RegExp> = {
  claude: /[❯>]\s*$/,
  gemini: />\s*$/,
  codex: />\s*$/,
  shell: /[$%#]\s*$/,
};

interface AgentState {
  installedAgents: AgentConfig[];
  sessionStatuses: Record<string, AgentStatus>;
  setStatus: (sessionId: string, status: AgentStatus) => void;
  setInstalledAgents: (agents: AgentConfig[]) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  installedAgents: [],
  sessionStatuses: {},
  setStatus: (sessionId, status) =>
    set((state) => ({
      sessionStatuses: { ...state.sessionStatuses, [sessionId]: status },
    })),
  setInstalledAgents: (agents) => set({ installedAgents: agents }),
}));
