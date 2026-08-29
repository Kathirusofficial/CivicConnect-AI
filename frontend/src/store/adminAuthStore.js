import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      adminUser: null,
      adminToken: null,
      isAdminAuthenticated: false,
      isLoading: false,
      error: null,

      adminLogin: (userData, token) => {
        localStorage.setItem('admin-token', token);
        set({
          adminUser: userData,
          adminToken: token,
          isAdminAuthenticated: true,
          error: null,
        });
      },

      adminLogout: () => {
        localStorage.removeItem('admin-token');
        set({ adminUser: null, adminToken: null, isAdminAuthenticated: false, error: null });
      },

      setAdminLoading: (isLoading) => set({ isLoading }),
      setAdminError: (error) => set({ error }),
      clearAdminError: () => set({ error: null }),

      getToken: () => get().adminToken || localStorage.getItem('admin-token'),
    }),
    {
      name: 'admin-auth-store',
      partialize: (state) => ({
        adminUser: state.adminUser,
        adminToken: state.adminToken,
        isAdminAuthenticated: state.isAdminAuthenticated,
      }),
    }
  )
);
