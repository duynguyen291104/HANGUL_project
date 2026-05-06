import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  level: string;
  levelLocked?: boolean;
  totalXP: number;
  trophy?: number;  // For tournament feature
  avatar?: string;
  currentStreak?: number;  // For streak tracking
  lastActiveAt?: string;
  provider?: string;  // 'local' | 'google'
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  updateLevel: (level: string, newTrophy?: number) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => {
  // 🔥 LOAD USER từ localStorage khi app khởi động
  const savedUser = typeof window !== 'undefined' 
    ? localStorage.getItem('user') 
    : null;
  
  const initialUser = savedUser ? JSON.parse(savedUser) : null;

  return {
    user: initialUser,
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    isLoading: false,
    error: null,

    login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Đăng nhập thất bại');
      }

      const data = await response.json();
      console.log('Phản hồi đăng nhập:', data);
      
      // Validate response has required fields
      if (!data.userId || !data.email) {
        console.error('Cấu trúc phản hồi không hợp lệ:', data);
        throw new Error('Phản hồi máy chủ không hợp lệ: thiếu dữ liệu người dùng');
      }
      
      localStorage.setItem('token', data.token);
      
      // Backend returns userId, email, name, role, level, levelLocked, xp, trophy, token
      const user: User = {
        id: data.userId,
        email: data.email,
        name: data.name || '',
        role: data.role || 'USER',
        level: data.level || 'NEWBIE',
        levelLocked: data.levelLocked || false,
        totalXP: data.xp || 0,
        trophy: data.trophy || 0,  // Add trophy
        provider: 'local',
      };
      
      // 🔥 LƯU USER VÀO LOCALSTORAGE
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ user, token: data.token, isLoading: false });
    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  googleLogin: async (accessToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/google-login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Đăng nhập Google thất bại');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);

      const user: User = {
        id: data.userId,
        email: data.email,
        name: data.name || '',
        role: data.role || 'USER',
        level: data.level || 'CỰC_CƠ_BẢN',
        levelLocked: data.levelLocked || false,
        totalXP: data.xp || 0,
        trophy: data.trophy || 0,
        avatar: data.avatar || undefined,
        provider: 'google',
      };

      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: data.token, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, name: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const rawError = errorData.error || '';
        let errorMessage = 'Đăng ký thất bại';
        if (rawError.toLowerCase().includes('email already exists') || response.status === 409) {
          errorMessage = 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.';
        } else if (rawError.toLowerCase().includes('missing required')) {
          errorMessage = 'Vui lòng điền đầy đủ thông tin.';
        } else if (rawError) {
          errorMessage = rawError;
        }
        throw new Error(errorMessage);
      }

      set({ isLoading: false });
    } catch (error: any) {
      console.error('Lỗi đăng ký:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // 🔥 XÓA USER LỚP
    set({ user: null, token: null });
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token });
  },


  updateLevel: async (level: string, newTrophy?: number) => {
    try {
      // Update local state immediately (API call already done in handleSelectLevel)
      set((state) => {
        if (!state.user) {
          console.error('❌ User not found in state');
          throw new Error('User not authenticated');
        }

        const updatedUser = {
          ...state.user,
          level,
          levelLocked: true,  // Level is locked after selection
          ...(newTrophy !== undefined ? { trophy: newTrophy } : {}),
        };
        
        console.log('✅ Level updated locally:', level);
        // 🔥 SAVE UPDATED USER TO LOCALSTORAGE
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return {
          user: updatedUser,
        };
      });
    } catch (error: any) {
      console.error('❌ Error updating level:', error);
      throw error;
    }
  }
  };
});
