import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FadeIn } from '../../components/animations/FadeIn';

const colorfulBlobs = [
  { size: 350, x: '10%', y: '20%', color: 'from-accent-magenta/40 to-brand-400/30', duration: 7 },
  { size: 280, x: '70%', y: '15%', color: 'from-accent-cyan/35 to-accent-sky/25', duration: 9 },
  { size: 200, x: '60%', y: '70%', color: 'from-accent-warm/30 to-accent-coral/25', duration: 6 },
  { size: 260, x: '25%', y: '75%', color: 'from-brand-500/25 to-accent-violet/20', duration: 8 },
  { size: 180, x: '85%', y: '50%', color: 'from-accent-emerald/20 to-accent-lime/15', duration: 10 },
];

export const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-50 dark:bg-surface-950">
    {/* Animated background mesh */}
    <div className="absolute inset-0 bg-mesh-vivid opacity-60" />

    {/* Floating colorful blobs */}
    {colorfulBlobs.map((blob, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-full bg-gradient-to-br ${blob.color} blur-3xl`}
        style={{ width: blob.size, height: blob.size, left: blob.x, top: blob.y }}
        animate={{
          y: [0, -40, 20, -10, 0],
          x: [0, 20, -15, 10, 0],
          scale: [1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    {/* Giant 404 text with gradient */}
    <motion.div
      className="absolute text-[20rem] sm:text-[22rem] font-display font-bold select-none bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan bg-clip-text text-transparent opacity-15"
      animate={{ y: [0, -20, 0, 15, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
    >
      404
    </motion.div>

    <FadeIn>
      <div className="relative z-10 text-center space-y-8 max-w-lg px-4">
        {/* Sparkle icon */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan flex items-center justify-center mx-auto shadow-xl shadow-brand-500/30"
        >
          <Sparkles size={36} className="text-white" />
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            className="font-display text-5xl sm:text-7xl text-gradient tracking-tight"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            Page not found
          </motion.h1>
          <p className="text-surface-500 dark:text-surface-400 text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button size="lg" icon={Home}>Go Home</Button>
          </Link>
          <Button variant="outline" size="lg" icon={ArrowLeft} onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </FadeIn>
  </div>
);
