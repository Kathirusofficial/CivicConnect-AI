import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle, Shield, User } from 'lucide-react';
import { loginSchema } from '../../utils/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FadeIn } from '../../components/animations/FadeIn';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { authAPI } from '../../services/api';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, setLoading } = useAuthStore();
  const { adminLogin } = useAdminAuthStore();
  const setProfile = useUserStore((s) => s.setProfile);
  
  const [selectedPortal, setSelectedPortal] = useState('citizen'); // 'citizen' | 'government'
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      const res = await authAPI.login({
        email: data.email,
        password: data.password,
        portal: selectedPortal,
        role: selectedPortal === 'government' ? 'Government' : 'Citizen'
      });
      
      const { user, token } = res.data;
      
      // Store in auth store
      login(user, token);
      
      if (user.role === 'Admin' || user.role === 'Government') {
        adminLogin(user, token);
      }
      
      setProfile({
        id: user._id,
        fullName: user.name,
        email: user.email,
        mobile: user.mobile || '',
        role: (user.role || 'citizen').toLowerCase(),
        avatar: user.avatar || null,
        notifications: { email: true, push: true, sms: false, marketing: false }
      });

      if (user.role === 'Admin' || user.role === 'Government') {
        navigate('/government/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header Branding */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
              Civic<span className="text-gradient">Connect AI</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Choose your portal
          </h1>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Select your account type to access the authorized system interface
          </p>
        </div>

        {/* Portal Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60">
          <button
            type="button"
            onClick={() => { setSelectedPortal('citizen'); setServerError(''); }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
              selectedPortal === 'citizen'
                ? 'bg-white dark:bg-surface-900 text-brand-600 dark:text-brand-400 shadow-md shadow-black/5 dark:shadow-brand-500/10 border border-brand-500/20'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            <User size={15} />
            <span>Citizen</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedPortal('government'); setServerError(''); }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
              selectedPortal === 'government'
                ? 'bg-white dark:bg-surface-900 text-accent-violet dark:text-accent-violet shadow-md shadow-black/5 dark:shadow-accent-violet/10 border border-accent-violet/30'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            <Shield size={15} />
            <span>Government</span>
          </button>
        </div>

        {/* Portal Information Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-colors ${
          selectedPortal === 'government'
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300'
            : 'bg-brand-500/10 border-brand-500/30 text-brand-700 dark:text-brand-300'
        }`}>
          {selectedPortal === 'government' ? (
            <>
              <Shield size={16} className="shrink-0 text-purple-500" />
              <span><strong>Government Operations Portal:</strong> Restricted to verified municipal officers and administrative personnel.</span>
            </>
          ) : (
            <>
              <User size={16} className="shrink-0 text-brand-500" />
              <span><strong>Citizen Redressal Portal:</strong> Public access for grievance reporting, tracking, and satisfaction feedback.</span>
            </>
          )}
        </div>

        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{serverError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={selectedPortal === 'government' ? 'Government Email' : 'Email address'}
            type="email"
            icon={Mail}
            placeholder={selectedPortal === 'government' ? 'officer@civicconnect.gov' : 'citizen@example.com'}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-surface-600 dark:text-surface-400">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full font-semibold" 
            isLoading={isLoading} 
            icon={ArrowRight}
            variant={selectedPortal === 'government' ? 'primary' : 'primary'}
          >
            {selectedPortal === 'government' ? 'Login as Government' : 'Login as Citizen'}
          </Button>
        </form>

        <div className="pt-2 border-t border-surface-200 dark:border-surface-700/60 flex flex-col items-center gap-2 text-center text-xs text-surface-500 dark:text-surface-400">
          {selectedPortal === 'citizen' ? (
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700">
                Create citizen account
              </Link>
            </p>
          ) : (
            <p className="text-surface-400">
              Government credentials are provided by the municipal IT department.
            </p>
          )}

          <p className="text-[11px] text-surface-400 dark:text-surface-500 mt-1">
            Municipal Field Worker?{' '}
            <Link to="/worker/login" className="font-medium text-amber-500 dark:text-amber-400 hover:underline">
              Access Field Worker Portal &rarr;
            </Link>
          </p>
        </div>
      </div>
    </FadeIn>
  );
};
