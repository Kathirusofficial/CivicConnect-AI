import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('civicconnect-theme');
    if (stored) return stored;
    return 'dark';
  }
  return 'dark';
};

const getInitialFontSize = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('civicconnect-font-size');
    if (stored) return stored;
  }
  return 'Medium';
};

const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('civicconnect-language');
    if (stored) return stored;
  }
  return 'English';
};

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  fontSize: getInitialFontSize(),
  language: getInitialLanguage(),

  setTheme: (theme) => {
    try {
      localStorage.setItem('civicconnect-theme', theme);
    } catch (e) {}
    set({ theme });
  },

  setFontSize: (fontSize) => {
    try {
      localStorage.setItem('civicconnect-font-size', fontSize);
    } catch (e) {}
    set({ fontSize });
  },

  setLanguage: (language) => {
    try {
      localStorage.setItem('civicconnect-language', language);
    } catch (e) {}
    set({ language });
  },

  toggleTheme: () => {
    const current = get().theme;
    let next = 'light';
    if (current === 'light') {
      next = 'dark';
    } else if (current === 'dark') {
      next = 'light';
    } else {
      const isSystemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      next = isSystemDark ? 'light' : 'dark';
    }
    try {
      localStorage.setItem('civicconnect-theme', next);
    } catch (e) {}
    set({ theme: next });
  },
}));
