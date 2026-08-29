import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const SuccessCheck = ({ size = 80 }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
    className="flex items-center justify-center"
  >
    <motion.div
      className="rounded-full bg-gradient-to-br from-accent-emerald to-emerald-600 flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
      >
        <Check className="text-white" size={size * 0.45} strokeWidth={3} />
      </motion.div>
    </motion.div>
  </motion.div>
);
