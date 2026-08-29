import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { profileEditSchema } from '../../utils/validation';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FadeIn } from '../../components/animations/FadeIn';
import { PageTransition } from '../../components/animations/PageTransition';
import { useToast } from '../../components/ui/Toast';

export const EditProfilePage = () => {
  const { profile, updateProfile } = useUserStore();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      email: profile?.email || '',
      mobile: profile?.mobile || '',
    },
  });

  const onSubmit = (data) => {
    setIsLoading(true);
    setTimeout(() => {
      updateProfile(data);
      setIsLoading(false);
      addToast({ type: 'success', message: 'Profile updated successfully!' });
      navigate('/profile');
    }, 1000);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-8">
        <FadeIn>
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to profile
          </button>
          <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Update your personal information
          </p>
        </FadeIn>

        {/* Avatar */}
        <FadeIn delay={0.1}>
          <div className="glass-strong rounded-2xl p-6 shadow-glass">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan flex items-center justify-center text-white text-2xl font-semibold overflow-hidden cursor-pointer group shadow-lg shadow-brand-500/25 ring-4 ring-white dark:ring-surface-900">
                {profile?.fullName?.[0] || 'U'}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-surface-50">{profile?.fullName}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">{profile?.email}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Form */}
        <FadeIn delay={0.2}>
          <form onSubmit={handleSubmit(onSubmit)} className="glass-strong rounded-2xl p-6 shadow-glass space-y-5">
            <Input
              label="Full Name"
              placeholder="Your full name"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Mobile Number"
              placeholder="+1 (555) 000-0000"
              error={errors.mobile?.message}
              {...register('mobile')}
            />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={isLoading} icon={Save}>
                Save Changes
              </Button>
            </div>
          </form>
        </FadeIn>
      </div>
    </PageTransition>
  );
};
