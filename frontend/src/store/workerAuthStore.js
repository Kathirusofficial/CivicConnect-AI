import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWorkerAuthStore = create(
  persist(
    (set) => ({
      workerToken: null,
      workerUser: null,
      workerIsAuthenticated: false,

      workerLogin: (token, user) => set({
        workerToken: token,
        workerUser: user,
        workerIsAuthenticated: true
      }),

      workerLogout: () => set({
        workerToken: null,
        workerUser: null,
        workerIsAuthenticated: false
      }),

      updateWorkerStatus: (status) => set((state) => ({
        workerUser: state.workerUser ? { ...state.workerUser, status } : null
      }))
    }),
    {
      name: 'civicconnect-worker-auth',
      partialize: (state) => ({
        workerToken: state.workerToken,
        workerUser: state.workerUser,
        workerIsAuthenticated: state.workerIsAuthenticated
      })
    }
  )
);
