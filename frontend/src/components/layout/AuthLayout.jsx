import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FloatingElements } from '../animations/FloatingElements';
import { Sparkles, Loader2 } from 'lucide-react';
import { publicAPI } from '../../services/api';

const formatStatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '--';
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
};

export const AuthLayout = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    publicAPI.getStats()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data || res.data || {};
        setStats({
          totalComplaints: typeof data.totalComplaints === 'number' ? data.totalComplaints : 0,
          totalCitizens: typeof data.totalCitizens === 'number' ? data.totalCitizens : 0,
          resolvedComplaints: typeof data.resolvedComplaints === 'number' ? data.resolvedComplaints : 0,
        });
      })
      .catch((err) => {
        console.warn('Failed to fetch public statistics:', err.message);
        if (isMounted) {
          setStats(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const statItems = [
    { 
      label: 'Community Reports', 
      value: loading ? '...' : (stats ? formatStatNumber(stats.totalComplaints) : '--'), 
      icon: '📋', 
      accent: 'from-pink-400/30 to-rose-400/20', 
      border: 'border-pink-300/30' 
    },
    { 
      label: 'Active Citizens', 
      value: loading ? '...' : (stats ? formatStatNumber(stats.totalCitizens) : '--'), 
      icon: '👥', 
      accent: 'from-cyan-400/30 to-sky-400/20', 
      border: 'border-cyan-300/30' 
    },
    { 
      label: 'Issues Resolved', 
      value: loading ? '...' : (stats ? formatStatNumber(stats.resolvedComplaints) : '--'), 
      icon: '✅', 
      accent: 'from-orange-400/30 to-amber-400/20', 
      border: 'border-orange-300/30' 
    },
  ];

  return (
    <div className="min-h-screen relative flex">
      <FloatingElements />

      {/* Left: illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Multi-stop vibrant gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-magenta via-brand-600 to-accent-violet" />
        <div className="absolute inset-0 bg-gradient-to-tr from-accent-coral/40 via-transparent to-accent-cyan/30" />
        <div className="absolute inset-0 bg-mesh-vivid opacity-80" />

        {/* Animated color orbs */}
        <motion.div
          className="absolute top-20 right-20 w-64 h-64 rounded-full bg-accent-cyan/20 blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-32 left-10 w-72 h-72 rounded-full bg-accent-warm/20 blur-3xl"
          animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full bg-white/10 blur-2xl"
          animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <Sparkles size={22} className="text-white drop-shadow-lg" />
            </div>
            <span className="font-display text-2xl tracking-tight drop-shadow">CivicConnect</span>
          </Link>

          <div>
            <h2 className="font-display text-4xl xl:text-5xl leading-tight mb-4">
              Smart civic engagement,
              <br />
              <span className="italic text-pink-100 drop-shadow-lg">powered by AI.</span>
            </h2>
            <p className="text-pink-100/80 text-lg max-w-md leading-relaxed">
              Connect with your community, access government services, and make your voice heard through intelligent civic tools.
            </p>

            {/* Dynamic Real DB Statistics cards */}
            <div className="mt-10 space-y-4">
              {statItems.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-r ${stat.accent} backdrop-blur-md border ${stat.border} shadow-lg`}
                >
                  <span className="text-2xl drop-shadow">{stat.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-semibold drop-shadow">{stat.value}</p>
                      {loading && <Loader2 size={14} className="animate-spin text-white/70" />}
                    </div>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div />
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 bg-surface-50/80 dark:bg-surface-950/80 backdrop-blur-sm">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
