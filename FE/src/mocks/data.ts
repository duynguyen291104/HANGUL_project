/**
 * Mock Data - Single Source of Truth
 * Later: Replace with real DB queries
 */

export const mockUserStats = {
  userId: 1,
  email: 'user@example.com',
  name: 'User',
  level: 'BEGINNER',
  totalXP: 0,
  currentStreak: 0,
  quizCompleted: 0,
  vocabularyLearned: 0,
  achievementsUnlocked: 0,
};

export const mockAchievements = [
  {
    id: 1,
    name: 'First Steps',
    description: 'Complete your first quiz',
    icon: '',
    difficulty: 'EASY',
    xpReward: 50,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 2,
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: '',
    difficulty: 'MEDIUM',
    xpReward: 200,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 3,
    name: 'Korean Scholar',
    description: 'Learn 100 vocabulary items',
    icon: '',
    difficulty: 'HARD',
    xpReward: 500,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 4,
    name: 'Perfect Streak',
    description: 'Maintain 7-day learning streak',
    icon: '',
    difficulty: 'MEDIUM',
    xpReward: 300,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 5,
    name: 'Speed Learner',
    description: 'Complete quiz in under 5 minutes',
    icon: '',
    difficulty: 'MEDIUM',
    xpReward: 150,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 6,
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '',
    difficulty: 'HARD',
    xpReward: 400,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 7,
    name: 'Pronunciation Pro',
    description: 'Complete 20 pronunciation exercises',
    icon: '',
    difficulty: 'EASY',
    xpReward: 100,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 8,
    name: 'Handwriting Master',
    description: 'Complete 30 handwriting exercises',
    icon: '',
    difficulty: 'MEDIUM',
    xpReward: 250,
    unlocked: false,
    unlockedAt: null,
  },
];

export const mockLeaderboard = [
  { rank: 1, name: 'Kim Jong', level: 'ADVANCED', xp: 5000, streak: 15 },
  { rank: 2, name: 'Lee Min', level: 'INTERMEDIATE', xp: 4500, streak: 12 },
  { rank: 3, name: 'Park Sun', level: 'INTERMEDIATE', xp: 4200, streak: 10 },
  { rank: 4, name: 'Choi Min', level: 'BEGINNER', xp: 3800, streak: 8 },
  { rank: 5, name: 'Kang Ho', level: 'BEGINNER', xp: 3500, streak: 7 },
];

export const mockQuizProgress = {
  totalCompleted: 0,
  averageScore: 0,
  bestScore: 0,
  recentQuizzes: [],
};

export const mockDailyChallenge = {
  id: 1,
  title: 'Learn 5 New Words',
  description: 'Learn 5 new vocabulary items',
  progress: 0,
  goal: 5,
  reward: 100,
  completed: false,
};

export const mockTodayStats = {
  tasksCompleted: 0,
  xpEarned: 0,
  studyTime: 0, // in minutes
};
