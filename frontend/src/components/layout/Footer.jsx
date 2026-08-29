import { Sparkles } from 'lucide-react';

export const Footer = () => (
  <footer className="relative border-t border-transparent bg-surface-50/50 dark:bg-surface-950/50">
    {/* Colorful top gradient border */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent-magenta via-brand-500 to-accent-cyan opacity-50" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-display text-surface-500 dark:text-surface-400">
            CivicConnect <span className="text-gradient font-medium">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-surface-400 dark:text-surface-500">
          <a href="#" className="hover:text-accent-magenta transition-colors">Privacy</a>
          <a href="#" className="hover:text-brand-500 transition-colors">Terms</a>
          <a href="#" className="hover:text-accent-cyan transition-colors">Help</a>
        </div>
        <p className="text-xs text-surface-400 dark:text-surface-500">
          &copy; 2026 CivicConnect. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);
