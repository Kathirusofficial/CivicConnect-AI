import { create } from 'zustand';

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('civicconnect-user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed._id || parsed.id || 'usr_001',
        fullName: parsed.name || parsed.fullName || 'Citizen',
        email: parsed.email || '',
        mobile: parsed.mobile || '',
        state: parsed.state || '',
        city: parsed.city || '',
        address: parsed.address || '',
        pinCode: parsed.pinCode || '',
        role: (parsed.role || 'citizen').toLowerCase(),
        avatar: parsed.avatar || null,
        accountStatus: 'active',
        notifications: { email: true, push: true, sms: false, marketing: false },
      };
    }
  } catch (e) {}
  return null;
};

export const useUserStore = create((set) => ({
  profile: getInitialUser(),
  isEditing: false,
  setProfile: (profile) => set({ profile }),
  updateProfile: (data) =>
    set((state) => ({ profile: { ...(state.profile || {}), ...data } })),
  setEditing: (isEditing) => set({ isEditing }),
  updateNotifications: (prefs) =>
    set((state) => ({
      profile: {
        ...(state.profile || {}),
        notifications: { ...(state.profile?.notifications || {}), ...prefs },
      },
    })),
}));
