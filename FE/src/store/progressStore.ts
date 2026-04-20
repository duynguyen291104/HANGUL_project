import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressStore {
  totalXP: number;
  currentStreak: number;
  lastCheckinDate: string | null;
  quizzesSolved: number;
  wordsLearned: number;
  addXP: (amount: number) => void;
  updateStreak: () => void;
  incrementQuiz: () => void;
  incrementWords: () => void;
  resetDaily: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      totalXP: 0,
      currentStreak: 0,
      lastCheckinDate: null,
      quizzesSolved: 0,
      wordsLearned: 0,

      addXP: (amount: number) => {
        set((state) => ({
          totalXP: state.totalXP + amount,
        }));
      },

      updateStreak: () => {
        const today = new Date().toDateString();
        const lastDate = get().lastCheckinDate;

        if (lastDate === today) {
          return; // Already checked in today
        }

        const yesterday = new Date(Date.now() - 86400000).toDateString();

        set((state) => ({
          currentStreak: lastDate === yesterday ? state.currentStreak + 1 : 1,
          lastCheckinDate: today,
        }));
      },

      incrementQuiz: () => {
        set((state) => ({
          quizzesSolved: state.quizzesSolved + 1,
        }));
      },

      incrementWords: () => {
        set((state) => ({
          wordsLearned: state.wordsLearned + 1,
        }));
      },

      resetDaily: () => {
        const today = new Date().toDateString();
        const lastDate = get().lastCheckinDate;

        if (lastDate !== today) {
          set({
            quizzesSolved: 0,
            wordsLearned: 0,
          });
        }
      },
    }),
    {
      name: 'progress-store',
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
