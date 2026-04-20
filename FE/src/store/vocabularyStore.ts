import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Vocabulary {
  id: number;
  korean: string;
  english: string;
  romanization: string;
  audioUrl?: string;
  imageUrl?: string;
  level: string;
}

interface VocabularyStore {
  vocabularyLearned: Vocabulary[];
  addVocabulary: (vocab: Vocabulary) => void;
  removevocabulary: (id: number) => void;
  getVocabularyByLevel: (level: string) => Vocabulary[];
  clearAll: () => void;
}

export const useVocabularyStore = create<VocabularyStore>()(
  persist(
    (set, get) => ({
      vocabularyLearned: [],

      addVocabulary: (vocab: Vocabulary) => {
        set((state) => ({
          vocabularyLearned: [...state.vocabularyLearned, vocab],
        }));
      },

      removevocabulary: (id: number) => {
        set((state) => ({
          vocabularyLearned: state.vocabularyLearned.filter((v) => v.id !== id),
        }));
      },

      getVocabularyByLevel: (level: string) => {
        return get().vocabularyLearned.filter((v) => v.level === level);
      },

      clearAll: () => {
        set({ vocabularyLearned: [] });
      },
    }),
    {
      name: 'vocabulary-store',
      storage: typeof window !== 'undefined'
        ? {
            getItem: (name: string) => {
              const item = localStorage.getItem(name);
              return item ? JSON.parse(item) : null;
            },
            setItem: (name: string, value: any) => {
              localStorage.setItem(name, JSON.stringify(value));
            },
            removeItem: (name: string) => {
              localStorage.removeItem(name);
            },
          }
        : undefined,
    }
  )
);
