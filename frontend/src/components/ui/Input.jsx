import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(
  ({ label, error, icon: Icon, type = 'text', className = '', rightElement, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 group-focus-within:text-brand-500 transition-colors">
              <Icon size={18} />
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={`w-full rounded-xl border bg-white dark:bg-surface-900/50 px-4 py-3 text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 dark:placeholder:text-surface-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:focus:ring-brand-400/30 dark:focus:border-brand-400 ${
              Icon ? 'pl-11' : ''
            } ${isPassword ? 'pr-12' : rightElement ? 'pr-12' : ''} ${
              error
                ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                : 'border-surface-200 dark:border-surface-700'
            }`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          {!isPassword && rightElement && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-500 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
