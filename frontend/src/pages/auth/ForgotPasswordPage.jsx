import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { forgotPasswordSchema } from '../../utils/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FadeIn } from '../../components/animations/FadeIn';
import { SuccessCheck } from '../../components/animations/SuccessCheck';

export const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
    }, 1500);
  };

  if (sent) {
    return (
      <FadeIn>
        <div className="text-center space-y-6 py-8">
          <SuccessCheck />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="font-display text-2xl text-surface-900 dark:text-surface-50">Check your email</h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              We&apos;ve sent a password reset link to your email address. Please check your inbox.
            </p>
          </motion.div>
          <div className="space-y-3">
            <Link to="/reset-password">
              <Button size="lg" className="w-full" icon={Send}>
                Open reset page
              </Button>
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-brand-600 transition-colors">
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            No worries, we&apos;ll send you reset instructions
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email address"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading} icon={Send}>
            Send reset link
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
