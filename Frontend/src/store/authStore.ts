import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  isAuthenticated: boolean;
  setAuth: (data: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,
      firstName: null,
      isAuthenticated: false,
      setAuth: (data) => {
        localStorage.setItem('token', data.token);
        set({
          token: data.token,
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          isAuthenticated: true,
        });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({
          token: null,
          userId: null,
          email: null,
          firstName: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);