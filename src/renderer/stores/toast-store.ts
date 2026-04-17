import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  kind: 'error' | 'warning' | 'info';
  title: string;
  detail?: string;
  createdAt: number;
}

interface ToastState {
  toasts: ToastMessage[];
  push: (t: Omit<ToastMessage, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...t, id: crypto.randomUUID(), createdAt: Date.now() },
      ],
    })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
