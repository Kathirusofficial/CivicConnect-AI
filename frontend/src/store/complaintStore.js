import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useComplaintStore = create((set, get) => ({
  complaints: [],
  setComplaints: (complaints) => set({ complaints: complaints || [] }),
  addComplaint: (complaint) => set((state) => ({ 
    complaints: [complaint, ...(state.complaints || [])] 
  })),
  getStats: () => {
    const complaints = get().complaints || [];
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      inProgress: complaints.filter(c => c.status === 'In Progress' || c.status === 'Verified' || c.status === 'Assigned').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      rejected: complaints.filter(c => c.status === 'Rejected').length,
    };
  }
}));
