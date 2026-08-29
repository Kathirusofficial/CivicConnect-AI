import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-gradient-to-r from-brand-500 via-brand-600 to-accent-violet text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:brightness-110',
  secondary: 'bg-surface-100 hover:bg-surface-200 text-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-200',
  outline: 'border-2 border-transparent bg-gradient-to-r from-brand-500 via-brand-600 to-accent-violet bg-clip-padding text-surface-700 hover:text-white dark:text-surface-300 dark:hover:text-white',
  ghost: 'hover:bg-surface-100 text-surface-600 dark:hover:bg-surface-800 dark:text-surface-400',
  danger: 'bg-gradient-to-r from-accent-coral to-red-600 text-white shadow-lg shadow-red-500/25',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
  xl: 'px-10 py-4 text-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : Icon ? (
        <Icon size={18} />
      ) : null}
      {children}
    </motion.button>
  );
};
