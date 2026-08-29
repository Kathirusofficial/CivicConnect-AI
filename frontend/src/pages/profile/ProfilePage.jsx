import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Calendar, Clock, Edit3, Bell, Lock, CheckCircle } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/animations/FadeIn';
import { PageTransition } from '../../components/animations/PageTransition';

export const ProfilePage = () => {
  const { profile } = useUserStore();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const infoItems = [
    { icon: User, label: 'Full Name', value: profile?.fullName },
    { icon: Mail, label: 'Email', value: profile?.email },
    { icon: Phone, label: 'Mobile', value: profile?.mobile },
    { icon: Shield, label: 'Role', value: profile?.role === 'citizen' ? 'Citizen' : 'Government Worker' },
    { icon: CheckCircle, label: 'Status', value: profile?.accountStatus === 'active' ? 'Active' : 'Inactive' },
    { icon: Clock, label: 'Last Login', value: formatDate(profile?.lastLogin) },
    { icon: Calendar, label: 'Member Since', value: formatDate(profile?.createdAt) },
  ];

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">Profile</h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Manage your account information</p>
            </div>
            <Link to="/profile/edit">
              <Button icon={Edit3}>Edit Profile</Button>
            </Link>
          </div>
        </FadeIn>

        {/* Profile Card */}
        <FadeIn delay={0.1}>
          <div className="relative glass-strong rounded-3xl p-8 shadow-glass overflow-hidden">
            {/* Colorful decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent-magenta via-brand-500 to-accent-cyan" />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent-cyan/10 blur-3xl" />
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan flex items-center justify-center text-white text-3xl font-semibold shadow-xl shadow-brand-500/30 ring-4 ring-white dark:ring-surface-900">
                {profile?.fullName?.[0] || 'U'}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">{profile?.fullName}</h2>
                <p className="text-surface-500 dark:text-surface-400">{profile?.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle size={12} />
                  {profile?.accountStatus === 'active' ? 'Active Account' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Info Sections */}
        <StaggerContainer className="grid gap-6 md:grid-cols-2" staggerDelay={0.08}>
          {/* Personal Information */}
          <StaggerItem>
            <div className="glass-strong rounded-2xl p-6 shadow-glass h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-magenta to-brand-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <User size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50">Personal Information</h3>
              </div>
              <div className="space-y-4">
                {infoItems.slice(0, 4).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-surface-500">
                      <item.icon size={14} />
                      {item.label}
                    </div>
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Security & Account */}
          <StaggerItem>
            <div className="glass-strong rounded-2xl p-6 shadow-glass h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Lock size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50">Security</h3>
              </div>
              <div className="space-y-4">
                {infoItems.slice(4).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-surface-500">
                      <item.icon size={14} />
                      {item.label}
                    </div>
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Notifications */}
          <StaggerItem className="md:col-span-2">
            <div className="glass-strong rounded-2xl p-6 shadow-glass">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-sky flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Bell size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50">Notification Preferences</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(profile?.notifications || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300 capitalize">{key.replace(/([A-Z])/g, ' $1')} Notifications</span>
                    <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${value ? 'bg-gradient-to-r from-brand-500 to-accent-magenta' : 'bg-surface-300 dark:bg-surface-600'}`}>
                      <motion.div
                        animate={{ x: value ? 16 : 0 }}
                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};
