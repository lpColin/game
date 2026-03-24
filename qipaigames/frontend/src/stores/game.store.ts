import { create } from 'zustand';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface GameStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
}));