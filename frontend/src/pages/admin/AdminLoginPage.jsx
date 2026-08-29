import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { adminAuthApi } from '../../services/adminApi';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { adminLogin, setAdminLoading, isLoading } = useAdminAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAdminLoading(true);
    try {
      const res = await adminAuthApi.login(form);
      const { user, token } = res.data;
      if (user.role !== 'Admin' && user.role !== 'Government') {
        setError('Access denied. Admin credentials required.');
        setAdminLoading(false);
        return;
      }
      adminLogin(user, token);
      navigate('/government/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-950">
      {/* Animated BG blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-600/20 blur-3xl" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent-violet/20 blur-3xl" />
        <motion.div animate={{ y: [-20, 20, -20] }} transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-1/2 left-1/4 w-72 h-72 rounded-full bg-accent-cyan/10 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4">
        
        {/* Card */}
        <div className="glass-strong p-8 rounded-3xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-violet shadow-glow mb-4">
              <Shield size={28} className="text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-1">
              Government Operations Portal
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-surface-400 text-sm flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="text-brand-400" />
              CivicConnect AI — Municipal Operations Access
            </motion.p>
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@civicconnect.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white placeholder-surface-500 text-sm focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter admin password"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white placeholder-surface-500 text-sm focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              id="admin-login-btn"
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2">
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <><Shield size={16} /> Access Admin Panel</>
              )}
            </motion.button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-5 border-t border-surface-700/50">
            <p className="text-xs text-surface-500 text-center">
              🔒 This panel is restricted to administrators only. <br />
              Citizens should use the{' '}
              <a href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">citizen portal</a>.
            </p>
          </div>
        </div>

        {/* Hint Card */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-4 p-4 rounded-2xl bg-surface-800/40 border border-surface-700/30 text-center">
          <p className="text-xs text-surface-500">
            Demo credentials: <span className="text-brand-400 font-mono">admin@civicconnect.com</span>
            {' / '}<span className="text-brand-400 font-mono">adminpassword</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
