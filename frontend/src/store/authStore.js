import { create } from 'zustand';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('civicconnect-user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: localStorage.getItem('civicconnect-token') || null,
  isAuthenticated: !!localStorage.getItem('civicconnect-token'),
  isLoading: false,
  error: null,

  login: (userData, token) => {
    if (token) {
      localStorage.setItem('civicconnect-token', token);
    }
    if (userData) {
      localStorage.setItem('civicconnect-user', JSON.stringify(userData));
    }
    set({
      user: userData,
      token: token || localStorage.getItem('civicconnect-token'),
      isAuthenticated: true,
      error: null,
    });
  },
  logout: () => {
    localStorage.removeItem('civicconnect-token');
    localStorage.removeItem('civicconnect-user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem('civicconnect-user', JSON.stringify(user));
    }
    set({ user });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

