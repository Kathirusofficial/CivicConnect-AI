import { motion } from 'framer-motion';
import { getPasswordStrength } from '../../utils/passwordStrength';

export const PasswordStrengthMeter = ({ password }) => {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <motion.div
            key={level}
            className="h-1.5 flex-1 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className={`h-full rounded-full ${strength.color}`}
              initial={{ width: '0%' }}
              animate={{ width: level <= strength.score ? '100%' : '0%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-xs font-medium ${strength.textColor}`}
      >
        {strength.label}
      </motion.p>
    </div>
  );
};
