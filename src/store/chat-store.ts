import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  threads: ChatThread[];
  activeId: string | null;
  createThread: (title?: string) => string;
  selectThread: (id: string | null) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  appendMessage: (threadId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage;
  updateMessage: (threadId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  clearAll: () => void;
}

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      threads: [],
      activeId: null,
      createThread: (title = 'Nova conversa') => {
        const t: ChatThread = {
          id: uid(),
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ threads: [t, ...s.threads], activeId: t.id }));
        return t.id;
      },
      selectThread: (id) => set({ activeId: id }),
      deleteThread: (id) =>
        set((s) => {
          const threads = s.threads.filter((t) => t.id !== id);
          const activeId = s.activeId === id ? threads[0]?.id ?? null : s.activeId;
          return { threads, activeId };
        }),
      renameThread: (id, title) =>
        set((s) => ({
          threads: s.threads.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)),
        })),
      appendMessage: (threadId, msg) => {
        const message: ChatMessage = { ...msg, id: uid(), createdAt: Date.now() };
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: [...t.messages, message],
                  updatedAt: Date.now(),
                  title:
                    t.title === 'Nova conversa' && msg.role === 'user'
                      ? msg.content.slice(0, 48)
                      : t.title,
                }
              : t,
          ),
        }));
        return message;
      },
      updateMessage: (threadId, messageId, patch) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                }
              : t,
          ),
        })),
      clearAll: () => set({ threads: [], activeId: null }),
    }),
    { name: 'ramu-chat-store' },
  ),
);
