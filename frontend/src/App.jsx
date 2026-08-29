import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './routes';
import { useThemeStore } from './store/themeStore';
import { ToastProvider } from './components/ui/Toast';
import { FloatingElements } from './components/animations/FloatingElements';
import { AnimatedBackground } from './components/background/AnimatedBackground';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ThemeEffect = () => {
  const theme = useThemeStore((s) => s.theme);
  const fontSize = useThemeStore((s) => s.fontSize);

  // Apply Theme Mode (Dark, Light, System)
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Apply Font Size (Small, Medium, Large)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    const sizeKey = (fontSize || 'medium').toLowerCase();
    root.classList.add(`font-size-${sizeKey}`);
  }, [fontSize]);

  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeEffect />
        <AnimatedBackground />
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
