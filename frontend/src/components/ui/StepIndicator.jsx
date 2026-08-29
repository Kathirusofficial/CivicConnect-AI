import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-brand-600 text-white'
                    : isCurrent
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 ring-2 ring-brand-500/30'
                    : 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500'
                }`}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {isCompleted ? <Check size={18} /> : index + 1}
              </motion.div>
              <span className={`absolute -bottom-6 text-xs font-medium whitespace-nowrap ${
                isCurrent ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'
              }`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-20px]">
                <motion.div
                  className="h-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-brand-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                </motion.div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
