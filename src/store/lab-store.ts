import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LabMode } from '@/lib/lab-helpers';

export interface LabCard {
  id: string;
  type: LabMode;
  prompt: string;
  model?: string;
  imageUrl?: string;     // data URL ou https
  svg?: string;          // texto svg
  text?: string;         // resposta de chat
  position: { x: number; y: number };
  createdAt: number;
  shareId?: string;      // id no banco quando compartilhado
}

interface LabState {
  cards: LabCard[];
  selectedId: string | null;
  isPro: boolean;
  lastGenerationAt: number;
  cooldownMs: number;
  addCard: (card: Omit<LabCard, 'id' | 'position' | 'createdAt'>) => LabCard;
  updateCard: (id: string, patch: Partial<LabCard>) => void;
  removeCard: (id: string) => void;
  select: (id: string | null) => void;
  setPro: (v: boolean) => void;
  markGenerated: () => void;
  cooldownRemaining: () => number;
  clear: () => void;
}

const COOLDOWN = 10_000;

// Posiciona em grid suave a partir de uma seed aleatória
let nextPos = { x: 80, y: 80 };
const advance = () => {
  const p = { ...nextPos };
  nextPos.x += 360;
  if (nextPos.x > 1400) {
    nextPos.x = 80;
    nextPos.y += 380;
  }
  return p;
};

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      cards: [],
      selectedId: null,
      isPro: false,
      lastGenerationAt: 0,
      cooldownMs: COOLDOWN,
      addCard: (card) => {
        const newCard: LabCard = {
          ...card,
          id: crypto.randomUUID(),
          position: advance(),
          createdAt: Date.now(),
        };
        set((s) => ({ cards: [...s.cards, newCard], selectedId: newCard.id }));
        return newCard;
      },
      updateCard: (id, patch) =>
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCard: (id) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      select: (id) => set({ selectedId: id }),
      setPro: (v) => set({ isPro: v }),
      markGenerated: () => set({ lastGenerationAt: Date.now() }),
      cooldownRemaining: () => {
        const elapsed = Date.now() - get().lastGenerationAt;
        return Math.max(0, COOLDOWN - elapsed);
      },
      clear: () => set({ cards: [], selectedId: null }),
    }),
    {
      name: 'ramu-lab-store',
      partialize: (s) => ({ cards: s.cards, isPro: s.isPro }),
    },
  ),
);
