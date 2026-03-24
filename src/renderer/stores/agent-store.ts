import { create } from 'zustand';
import type { AgentConfig, AgentStatus } from '../../types/ipc';

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
