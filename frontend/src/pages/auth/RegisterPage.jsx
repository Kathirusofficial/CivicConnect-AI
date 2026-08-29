import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Lock, Briefcase, Users, Camera, ArrowRight, ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';
import { registerStep1Schema, registerStep2Schema } from '../../utils/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { FadeIn } from '../../components/animations/FadeIn';
import { SuccessCheck } from '../../components/animations/SuccessCheck';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { authAPI } from '../../services/api';
import { ROLES } from '../../constants';

const steps = ['Account', 'Password', 'Role', 'Photo', 'Review'];

export const RegisterPage = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [avatar, setAvatar] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const setProfile = useUserStore((s) => s.setProfile);

  const step1 = useForm({ resolver: zodResolver(registerStep1Schema) });
  const step2 = useForm({ resolver: zodResolver(registerStep2Schema) });

  const handleStep1 = (data) => { 
    setServerError('');
    setFormData({ ...formData, ...data }); 
    setStep(1); 
  };
  const handleStep2 = (data) => { 
    setServerError('');
    setFormData({ ...formData, ...data }); 
    setStep(2); 
  };

  const handleRoleSelect = () => {
    setServerError('');
    setFormData({ ...formData, role: selectedRole });
    setStep(3);
  };

  const handlePhotoSubmit = () => { 
    setServerError('');
    setStep(4); 
  };

  const handleComplete = async () => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const res = await authAPI.register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        role: formData.role === 'government' ? 'Government' : 'Citizen',
      });
      const { user, token } = res.data;
      login(user, token);
      setProfile({
        id: user._id,
        fullName: user.name,
        email: user.email,
        mobile: user.mobile || formData.mobile || '',
        role: (user.role || 'citizen').toLowerCase(),
        avatar: user.avatar || null,
        notifications: { email: true, push: true, sms: false, marketing: false }
      });
      setIsComplete(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <FadeIn>
        <div className="text-center space-y-6 py-8">
          <SuccessCheck />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="font-display text-2xl text-surface-900 dark:text-surface-50">Account created!</h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Redirecting to your dashboard...</p>
          </motion.div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-display text-xl tracking-tight">
            Civic<span className="text-gradient">Connect</span>
          </span>
        </div>

        <div>
          <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">
            Create account
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Join CivicConnect in a few simple steps
          </p>
        </div>

        {/* Step indicator */}
        <div className="pb-8">
          <StepIndicator steps={steps} currentStep={step} />
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {/* Step 1: Account Info */}
          {step === 0 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={step1.handleSubmit(handleStep1)}
              className="space-y-5"
            >
              <Input label="Full Name" icon={User} placeholder="John Doe" error={step1.formState.errors.fullName?.message} {...step1.register('fullName')} />
              <Input label="Email" icon={Mail} placeholder="you@example.com" error={step1.formState.errors.email?.message} {...step1.register('email')} />
              <Input label="Mobile Number" icon={Phone} placeholder="+1 (555) 000-0000" error={step1.formState.errors.mobile?.message} {...step1.register('mobile')} />
              <Button type="submit" size="lg" className="w-full" icon={ArrowRight}>Continue</Button>
            </motion.form>
          )}

          {/* Step 2: Password */}
          {step === 1 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={step2.handleSubmit(handleStep2)}
              className="space-y-5"
            >
              <div>
                <Input label="Password" type="password" icon={Lock} placeholder="Create a strong password" error={step2.formState.errors.password?.message} {...step2.register('password')} />
                <PasswordStrengthMeter password={step2.watch('password')} />
              </div>
              <Input label="Confirm Password" type="password" icon={Lock} placeholder="Confirm your password" error={step2.formState.errors.confirmPassword?.message} {...step2.register('confirmPassword')} />
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(0)} icon={ArrowLeft}>Back</Button>
                <Button type="submit" className="flex-1" size="lg" icon={ArrowRight}>Continue</Button>
              </div>
            </motion.form>
          )}

          {/* Step 3: Role */}
          {step === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <p className="text-sm text-surface-500 dark:text-surface-400">Select your role to personalize your experience</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ROLES.map((role) => {
                  const Icon = role.icon === 'Briefcase' ? Briefcase : Users;
                  const isSelected = selectedRole === role.id;
                  return (
                    <motion.button
                      key={role.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRole(role.id)}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                      <Icon size={24} className={isSelected ? 'text-brand-600' : 'text-surface-400'} />
                      <h3 className="mt-3 font-semibold text-surface-900 dark:text-surface-50">{role.label}</h3>
                      <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{role.description}</p>
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)} icon={ArrowLeft}>Back</Button>
                <Button onClick={handleRoleSelect} className="flex-1" size="lg" icon={ArrowRight}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Photo */}
          {step === 3 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <p className="text-sm text-surface-500 dark:text-surface-400">Add a profile photo to personalize your account</p>
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-28 h-28 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-surface-300 dark:border-surface-600 cursor-pointer group"
                  onClick={() => document.getElementById('photo-upload').click()}
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={32} className="text-surface-400 group-hover:text-brand-500 transition-colors" />
                  )}
                </motion.div>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAvatar(URL.createObjectURL(file));
                  }}
                />
                <p className="text-xs text-surface-400">Click to upload (optional)</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} icon={ArrowLeft}>Back</Button>
                <Button onClick={handlePhotoSubmit} className="flex-1" size="lg" icon={ArrowRight}>
                  {avatar ? 'Continue' : 'Skip for now'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {step === 4 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <p className="text-sm text-surface-500 dark:text-surface-400">Review your information before creating your account</p>
              <div className="space-y-3 p-5 rounded-2xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
                {[
                  { label: 'Name', value: formData.fullName },
                  { label: 'Email', value: formData.email },
                  { label: 'Mobile', value: formData.mobile },
                  { label: 'Role', value: formData.role === 'citizen' ? 'Citizen' : 'Government Worker' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                    <span className="text-sm text-surface-500">{item.label}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{item.value}</span>
                  </div>
                ))}
              </div>
              {avatar && (
                <div className="flex items-center gap-3">
                  <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                  <span className="text-sm text-surface-500">Profile photo added</span>
                </div>
              )}
              {serverError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)} icon={ArrowLeft} disabled={isSubmitting}>Back</Button>
                <Button onClick={handleComplete} className="flex-1" size="lg" icon={Check} isLoading={isSubmitting} disabled={isSubmitting}>Create Account</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-surface-500 dark:text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </FadeIn>
  );
};
