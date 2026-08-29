import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FadeIn } from '../../components/animations/FadeIn';
import { PageTransition } from '../../components/animations/PageTransition';

export const UnauthorizedPage = () => (
  <PageTransition>
    <div className="min-h-[70vh] flex items-center justify-center relative overflow-hidden">
      {/* Colorful background blobs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full bg-gradient-to-br from-accent-coral/20 to-accent-warm/15 blur-3xl"
        animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-gradient-to-br from-brand-500/15 to-accent-violet/10 blur-3xl"
        animate={{ y: [0, 15, 0], scale: [1, 0.9, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <FadeIn>
        <div className="text-center space-y-6 max-w-md relative z-10">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-coral to-red-600 flex items-center justify-center mx-auto shadow-xl shadow-red-500/30"
          >
            <ShieldX size={36} className="text-white" />
          </motion.div>
          <div>
            <h1 className="font-display text-4xl text-surface-900 dark:text-surface-50 tracking-tight">
              Access Denied
            </h1>
            <p className="mt-3 text-surface-500 dark:text-surface-400">
              You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/dashboard">
              <Button icon={ArrowLeft}>Back to Dashboard</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Sign in again</Button>
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  </PageTransition>
);
