// API service for backend calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Lỗi API: ${response.statusText}`);
  }

  return response.json();
};

// ========================
// VOCABULARY SERVICE
// ========================
export const vocabularyService = {
  getAll: (level?: string, topic?: string) => {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    if (topic) params.append('topic', topic);
    return apiCall(`/vocabulary${params.toString() ? '?' + params.toString() : ''}`);
  },

  getById: (id: number) => apiCall(`/vocabulary/${id}`),

  addToLearned: (id: number) => apiCall(`/vocabulary/${id}/learn`, { method: 'POST' }),

  // Admin only
  create: (data: any) =>
    apiCall('/vocabulary', { method: 'POST', body: JSON.stringify(data) }),

  bulkCreate: (vocabularies: any[]) =>
    apiCall('/vocabulary/bulk/create', {
      method: 'POST',
      body: JSON.stringify({ vocabularies }),
    }),

  update: (id: number, data: any) =>
    apiCall(`/vocabulary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiCall(`/vocabulary/${id}`, { method: 'DELETE' }),
};

// ========================
// QUIZ SERVICE
// ========================
export const quizService = {
  startQuiz: (numberOfQuestions?: number, topic?: string, difficulty?: string) =>
    apiCall('/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ numberOfQuestions, topic, difficulty }),
    }),

  submitAnswer: (sessionId: number, questionId: number, selectedAnswer: string) =>
    apiCall('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionId, selectedAnswer }),
    }),

  endQuiz: (sessionId: number) =>
    apiCall(`/quiz/end/${sessionId}`, { method: 'POST' }),

  getHistory: (limit?: number) =>
    apiCall(`/quiz/history?limit=${limit || 20}`),
};

// ========================
// USER SERVICE
// ========================
export const userService = {
  getProfile: (userId?: number) =>
    apiCall(userId ? `/user/profile/${userId}` : '/user/profile'),

  updateProfile: (data: any) =>
    apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addXP: (xpAmount: number) =>
    apiCall('/user/xp', {
      method: 'POST',
      body: JSON.stringify({ xpAmount }),
    }),

  updateStreak: (isActive: boolean) =>
    apiCall('/user/streak', {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),
};

// ========================
// LEADERBOARD SERVICE
// ========================
export const leaderboardService = {
  getTopUsers: (limit?: number, level?: string) =>
    apiCall(`/leaderboard/top?limit=${limit || 50}${level ? `&level=${level}` : ''}`),

  getWeekly: (limit?: number) =>
    apiCall(`/leaderboard/weekly?limit=${limit || 50}`),

  getMonthly: (limit?: number) =>
    apiCall(`/leaderboard/monthly?limit=${limit || 50}`),

  getUserRank: (userId: number) =>
    apiCall(`/leaderboard/rank/${userId}`),

  getNearby: (range?: number) =>
    apiCall(`/leaderboard/nearby?range=${range || 10}`),

  getStats: () =>
    apiCall('/leaderboard/stats'),
};

// ========================
// ACHIEVEMENT SERVICE
// ========================
export const achievementService = {
  getAll: () =>
    apiCall('/achievements'),

  getUnlocked: () =>
    apiCall('/achievements/unlocked'),

  getProgress: () =>
    apiCall('/achievements/progress'),

  checkAndAward: () =>
    apiCall('/achievements/check', { method: 'POST' }),

  getStats: () =>
    apiCall('/achievements/stats'),
};

// ========================
// CAMERA SERVICE
// ========================
export const cameraService = {
  detect: (imageBase64: string) =>
    apiCall('/camera/detect', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
    }),
};
