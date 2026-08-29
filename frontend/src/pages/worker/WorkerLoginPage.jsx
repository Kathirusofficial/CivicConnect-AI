import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HardHat, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { workerApi } from '../../services/workerApi';
import { useWorkerAuthStore } from '../../store/workerAuthStore';

export const WorkerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { workerLogin } = useWorkerAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await workerApi.login({ email, password });
      if (res.data?.success && res.data?.token) {
        workerLogin(res.data.token, res.data.user);
        navigate('/worker/dashboard');
      } else {
        setError(res.data?.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid worker email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161b22] border border-surface-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-1">
            <HardHat size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Field Worker Portal</h1>
          <p className="text-xs text-surface-400">CivicConnect AI — Municipal Operations Terminal</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase tracking-wide">
              Worker Email / ID
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@civicconnect.com"
                className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Field Terminal'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="pt-4 border-t border-surface-800/80 text-center">
          <p className="text-[11px] text-surface-500 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-amber-400" /> Secured Municipal Field Access
          </p>
        </div>
      </motion.div>
    </div>
  );
};
