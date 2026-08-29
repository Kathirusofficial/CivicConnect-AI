import { motion } from 'framer-motion';

const shapes = [
  { size: 380, x: '5%', y: '8%', color: 'from-accent-magenta/40 to-brand-400/30', duration: 8, delay: 0 },
  { size: 260, x: '70%', y: '55%', color: 'from-accent-cyan/35 to-accent-sky/25', duration: 10, delay: 2 },
  { size: 200, x: '55%', y: '5%', color: 'from-accent-warm/30 to-accent-coral/25', duration: 7, delay: 1 },
  { size: 300, x: '15%', y: '65%', color: 'from-brand-500/25 to-accent-violet/20', duration: 9, delay: 3 },
  { size: 220, x: '85%', y: '15%', color: 'from-accent-emerald/20 to-accent-lime/15', duration: 11, delay: 1.5 },
  { size: 180, x: '40%', y: '85%', color: 'from-accent-coral/25 to-accent-magenta/20', duration: 8.5, delay: 2.5 },
];

export const FloatingElements = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {shapes.map((shape, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-full bg-gradient-to-br ${shape.color} blur-3xl`}
        style={{
          width: shape.size,
          height: shape.size,
          left: shape.x,
          top: shape.y,
        }}
        animate={{
          y: [0, -40, 10, -20, 0],
          x: [0, 20, -15, 10, 0],
          scale: [1, 1.08, 0.92, 1.04, 1],
        }}
        transition={{
          duration: shape.duration,
          delay: shape.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);
