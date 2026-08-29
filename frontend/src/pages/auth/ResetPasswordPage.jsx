import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Check } from 'lucide-react';
import { resetPasswordSchema } from '../../utils/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { FadeIn } from '../../components/animations/FadeIn';
import { SuccessCheck } from '../../components/animations/SuccessCheck';

export const ResetPasswordPage = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <FadeIn>
        <div className="text-center space-y-6 py-8">
          <SuccessCheck />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="font-display text-2xl text-surface-900 dark:text-surface-50">Password reset!</h2>
            <p className="mt-2 text-sm text-surface-500">Redirecting to sign in...</p>
          </motion.div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Create a new strong password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Input
              label="New password"
              type="password"
              icon={Lock}
              placeholder="Enter new password"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordStrengthMeter password={watch('password')} />
          </div>
          <Input
            label="Confirm password"
            type="password"
            icon={Lock}
            placeholder="Confirm new password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading} icon={Check}>
            Reset password
          </Button>
        </form>

        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-brand-600 transition-colors">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </FadeIn>
  );
};
