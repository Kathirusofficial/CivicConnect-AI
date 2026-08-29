import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Bell, Lock, Palette, HelpCircle, LogOut, 
  ChevronRight, Check, AlertCircle, Loader2, Save, KeyRound, 
  Smartphone, Mail, MapPin, Eye, EyeOff, Sparkles, CheckCircle2,
  Sun, Moon, Monitor
} from 'lucide-react';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn } from '../../components/animations/FadeIn';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useThemeStore } from '../../store/themeStore';
import { authAPI } from '../../services/api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { INDIAN_STATES, getCitiesForState } from '../../data/indianLocations';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Personal info and contact details' },
  { id: 'security', label: 'Security', icon: Shield, desc: 'Password and account protection' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts and email preferences' },
  { id: 'privacy', label: 'Privacy', icon: Lock, desc: 'Data and visibility controls' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and display options' },
  { id: 'help', label: 'Help', icon: HelpCircle, desc: 'FAQs and support contact' },
];

export const SettingsPage = () => {
  const { user: authUser, setUser } = useAuthStore();
  const { profile, setProfile } = useUserStore();

  const [activeSection, setActiveSection] = useState('profile');
  
  // Profile Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    pinCode: '',
    address: '',
    city: '',
    state: ''
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  // Notifications State
  const [notifications, setNotifications] = useState({
    complaints: true,
    resolutions: true,
    government: true,
    emergency: true,
    emailAlerts: true
  });

  // Global Theme & Appearance Store
  const { theme, setTheme, fontSize, setFontSize, language, setLanguage } = useThemeStore();

  // General Status
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });

  // Sync profile data from real authenticated user
  useEffect(() => {
    const currentName = authUser?.name || profile?.fullName || '';
    const currentEmail = authUser?.email || profile?.email || '';
    const currentMobile = authUser?.mobile || profile?.mobile || '';
    const currentState = authUser?.state || profile?.state || '';
    const currentCity = authUser?.city || profile?.city || '';
    const currentAddress = authUser?.address || profile?.address || '';
    const currentPinCode = authUser?.pinCode || profile?.pinCode || '';

    setFormData(prev => ({
      ...prev,
      fullName: currentName,
      email: currentEmail,
      mobile: currentMobile,
      pinCode: currentPinCode || prev.pinCode || '',
      address: currentAddress || prev.address || '',
      state: currentState || prev.state || '',
      city: currentCity || prev.city || ''
    }));
  }, [authUser, profile]);

  const handleStateChange = (selectedState) => {
    const availableCities = getCitiesForState(selectedState);
    const isCityValid = availableCities.includes(formData.city);
    setFormData(prev => ({
      ...prev,
      state: selectedState,
      city: isCityValid ? prev.city : ''
    }));
  };

  const handleCityChange = (selectedCity) => {
    setFormData(prev => ({
      ...prev,
      city: selectedCity
    }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    // Validate state-city consistency
    if (formData.state && formData.city) {
      const validCities = getCitiesForState(formData.state);
      if (validCities.length > 0 && !validCities.includes(formData.city)) {
        setStatusMessage({
          type: 'error',
          message: `The city "${formData.city}" is not located in ${formData.state}. Please select a valid city.`
        });
        setIsSaving(false);
        return;
      }
    }

    try {
      const res = await authAPI.updateProfile({
        name: formData.fullName,
        mobile: formData.mobile,
        state: formData.state,
        city: formData.city,
        address: formData.address,
        pinCode: formData.pinCode
      });

      if (res.data?.user) {
        setUser(res.data.user);
        setProfile({
          id: res.data.user._id,
          fullName: res.data.user.name,
          email: res.data.user.email,
          mobile: res.data.user.mobile || '',
          state: res.data.user.state || '',
          city: res.data.user.city || '',
          address: res.data.user.address || '',
          pinCode: res.data.user.pinCode || '',
          role: (res.data.user.role || 'citizen').toLowerCase(),
          avatar: res.data.user.avatar || null,
          notifications: { email: true, push: true, sms: false, marketing: false }
        });
      }

      setStatusMessage({ type: 'success', message: 'Profile and location information updated successfully!' });
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 4000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordStatus({ type: 'success', message: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordStatus({ type: '', message: '' }), 4000);
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to change password.'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayName = formData.fullName || 'Citizen';
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Profile</h2>
              <p className="text-xs text-surface-400 mt-0.5">Manage your personal information and contact details.</p>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-900/60 border border-surface-700/50">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-2xl font-bold shadow-glow shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-base truncate">{displayName}</h3>
                <p className="text-xs text-surface-400 truncate">{formData.email || 'No email provided'}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Verified Citizen Account
                  </span>
                </div>
              </div>
            </div>

            {statusMessage.message && (
              <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.message}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Your legal full name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/40 border border-surface-800 text-surface-400 text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    placeholder="Postal PIN code"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street name, landmark, building number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">State / Union Territory</label>
                  <SearchableSelect
                    options={INDIAN_STATES}
                    value={formData.state}
                    onChange={handleStateChange}
                    placeholder="Select State / UT"
                    searchPlaceholder="Search Indian State or UT..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">City / Municipality</label>
                  <SearchableSelect
                    options={getCitiesForState(formData.state)}
                    value={formData.city}
                    onChange={handleCityChange}
                    placeholder={formData.state ? "Select City / Municipality" : "Select State First"}
                    searchPlaceholder="Search municipal city..."
                    disabled={!formData.state}
                    disabledPlaceholder="Select a state first"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-surface-700/50 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5 font-semibold shadow-glow disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Security</h2>
              <p className="text-xs text-surface-400 mt-0.5">Protect your account and update your credentials.</p>
            </div>

            {passwordStatus.message && (
              <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {passwordStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="p-5 rounded-2xl bg-surface-900/60 border border-surface-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <KeyRound size={15} className="text-brand-400" /> Change Password
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn-primary text-xs py-2 px-4 font-semibold disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            <div className="p-4 rounded-2xl bg-surface-900/40 border border-surface-800 space-y-2">
              <h4 className="text-xs font-semibold text-white">Active Session Info</h4>
              <p className="text-xs text-surface-400">
                You are currently logged into CivicConnect AI from this device via secure JWT token authentication.
              </p>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Notifications</h2>
              <p className="text-xs text-surface-400 mt-0.5">Control how CivicConnect communicates with you.</p>
            </div>

            <div className="space-y-3">
              {[
                { id: 'complaints', title: 'Complaint Updates', desc: 'Real-time status changes and field notes for your complaints' },
                { id: 'resolutions', title: 'Resolution Updates', desc: 'Alerts when field workers submit Before/After evidence and resolution approval' },
                { id: 'government', title: 'Government Responses', desc: 'Official administrative remarks and departmental re-assignments' },
                { id: 'emergency', title: 'Emergency Civic Alerts', desc: 'Critical city-wide safety warnings and disaster management notices' },
                { id: 'emailAlerts', title: 'Email Notifications', desc: 'Receive summary copies of major status updates in your inbox' },
              ].map((item) => {
                const isOn = notifications[item.id];
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-surface-900/60 rounded-xl border border-surface-700/50">
                    <div className="pr-4">
                      <h4 className="font-semibold text-white text-xs">{item.title}</h4>
                      <p className="text-xs text-surface-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications({ ...notifications, [item.id]: !isOn })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        isOn ? 'bg-brand-500' : 'bg-surface-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isOn ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Privacy & Data</h2>
              <p className="text-xs text-surface-400 mt-0.5">Review data policies and personal privacy controls.</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-surface-900/60 rounded-xl border border-surface-700/50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white text-xs">Field Worker PII Protection</h4>
                  <p className="text-xs text-surface-400 mt-0.5">Your phone and email are strictly redacted from field worker task views.</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Enforced (100%)
                </span>
              </div>

              <div className="p-4 bg-surface-900/60 rounded-xl border border-surface-700/50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white text-xs">AI Predictive Anonymization</h4>
                  <p className="text-xs text-surface-400 mt-0.5">Complaints aggregated into city-wide hotspot models have citizen identities masked.</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Active
                </span>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Appearance</h2>
              <p className="text-xs text-surface-400 mt-0.5">Customize your interface theme, typography, and display preferences.</p>
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-surface-300">Theme Mode</label>
                <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider">
                  Active: {theme}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'dark', label: 'Dark Mode', desc: 'CivicConnect Dark', icon: Moon },
                  { id: 'light', label: 'Light Mode', desc: 'High Contrast Clean', icon: Sun },
                  { id: 'system', label: 'System', desc: 'Follows OS theme', icon: Monitor },
                ].map((t) => {
                  const isSelected = theme === t.id;
                  const IconComponent = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/15 text-white shadow-sm ring-1 ring-brand-500/50'
                          : 'border-surface-700/60 bg-surface-900/60 text-surface-400 hover:border-surface-600 hover:bg-surface-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-brand-500 text-white' : 'bg-surface-800 text-surface-400 group-hover:text-surface-200'
                        }`}>
                          <IconComponent size={16} />
                        </div>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-500/30 text-brand-300 border border-brand-500/40 flex items-center gap-1">
                            <Check size={10} /> Selected
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-xs text-white">{t.label}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-surface-300">Font Size</label>
                  <span className="text-[10px] text-surface-400 font-mono">
                    {fontSize === 'Small' ? '14px Base' : fontSize === 'Large' ? '18px Base' : '16px Base'}
                  </span>
                </div>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                >
                  <option value="Small">Small (Compact — 14px)</option>
                  <option value="Medium">Medium (Default Standard — 16px)</option>
                  <option value="Large">Large (Enlarged — 18px)</option>
                </select>
                <p className="text-[10px] text-surface-400">Scales application typography globally for readability.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/70 text-white text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                >
                  <option value="English">English (Default — Active)</option>
                  <option value="Hindi" disabled>Hindi (Coming Soon)</option>
                  <option value="Spanish" disabled>Spanish (Coming Soon)</option>
                  <option value="Tamil" disabled>Tamil (Coming Soon)</option>
                </select>
                <p className="text-[10px] text-surface-400">Interface is localized in English. Regional language support in development.</p>
              </div>
            </div>

            {/* Visual Persistence Confirmation */}
            <div className="p-3.5 rounded-xl bg-surface-900/40 border border-surface-800 text-[11px] text-surface-400 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 shrink-0" />
              <span>Appearance preferences are saved instantly to your browser storage and will persist across sessions.</span>
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6">
            <div className="border-b border-surface-700/60 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Help & Support</h2>
              <p className="text-xs text-surface-400 mt-0.5">Find answers to common questions and get in touch.</p>
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'How does AI classification work?', desc: 'CivicConnect uses AI models to automatically assign severity, tags, and route complaints to the responsible municipal department.' },
                { title: 'What is SLA Monitoring?', desc: 'Every reported issue has a time-bound SLA target (4h Emergency, 24h High, 48h Medium) monitored for municipal accountability.' },
                { title: 'How can I track my complaint?', desc: 'Visit your My Complaints page or click on any complaint to view live status and field work photos.' },
                { title: 'Can I rate the resolution quality?', desc: 'Yes! Once resolved, you can provide a 1-5 star rating and feedback directly on the complaint details view.' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-surface-900/60 border border-surface-700/50 space-y-1">
                  <h4 className="font-semibold text-white text-xs flex items-center justify-between">
                    {item.title}
                  </h4>
                  <p className="text-xs text-surface-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Clean Header */}
        <FadeIn>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Settings</h1>
            <p className="mt-1 text-xs text-surface-400">
              Manage your account, privacy, notifications and preferences.
            </p>
          </div>
        </FadeIn>

        {/* 2-Column Responsive Settings Layout */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Left: Compact Settings Menu Card */}
          <div className="w-full md:w-60 shrink-0 glass-strong rounded-2xl p-2 shadow-glass border border-surface-700/50">
            {/* Mobile horizontal tabs / Desktop vertical list */}
            <div className="flex md:flex-col gap-1 overflow-x-auto scrollbar-hide">
              {SECTIONS.map((s) => {
                const isActive = activeSection === s.id;
                const IconComponent = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 text-left w-full ${
                      isActive
                        ? 'bg-brand-600/30 text-white border border-brand-500/40 shadow-sm'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800/60 border border-transparent'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-brand-400' : 'text-surface-400'} />
                    <span className="flex-1">{s.label}</span>
                    {isActive && <ChevronRight size={13} className="hidden md:block text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Section Content Area */}
          <div className="flex-1 w-full glass-strong rounded-2xl p-6 md:p-7 shadow-glass border border-surface-700/50 min-h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
