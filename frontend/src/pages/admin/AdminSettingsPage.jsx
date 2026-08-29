import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, Bell, Gauge, Save, Eye, EyeOff, Shield } from 'lucide-react';
import { useAdminAuthStore } from '../../store/adminAuthStore';

const tabs = [
  { id: 'profile', label: 'Admin Profile', icon: User },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System', icon: Gauge },
];

export const AdminSettingsPage = () => {
  const { adminUser } = useAdminAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState({ cur: false, new: false, confirm: false });
  const [profile, setProfile] = useState({ name: adminUser?.name || 'Admin Chief', email: adminUser?.email || 'admin@civicconnect.com', phone: '+1 (555) 000-0001' });
  const [notifPrefs, setNotifPrefs] = useState({ newComplaints: true, emergencies: true, workerUpdates: true, resolutions: true });
  const [sysPrefs, setSysPrefs] = useState({ autoAssign: false, darkMode: true, emailDigest: 'daily' });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={22} className="text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {tabs.map((t, i) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left ${activeTab === t.id ? 'bg-brand-600/20 text-brand-300' : 'text-surface-400 hover:text-white hover:bg-white/3'} ${i < tabs.length - 1 ? 'border-b border-white/5' : ''}`}>
                <t.icon size={15} className={activeTab === t.id ? 'text-brand-400' : 'text-surface-500'} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl space-y-5" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>

            {activeTab === 'profile' && (
              <>
                <h2 className="text-base font-semibold text-white flex items-center gap-2"><Shield size={16} className="text-brand-400" /> Admin Profile</h2>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/40 border border-surface-700/50">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-2xl font-bold">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{profile.name}</p>
                    <p className="text-brand-400 text-sm">Administrator</p>
                  </div>
                </div>
                {[['Full Name', 'name', 'text'], ['Email Address', 'email', 'email'], ['Phone Number', 'phone', 'tel']].map(([label, key, type]) => (
                  <div key={key}>
                    <label className="text-xs text-surface-400 mb-1.5 block">{label}</label>
                    <input type={type} value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm focus:border-brand-500/60 transition-all" />
                  </div>
                ))}
              </>
            )}

            {activeTab === 'password' && (
              <>
                <h2 className="text-base font-semibold text-white flex items-center gap-2"><Lock size={16} className="text-brand-400" /> Change Password</h2>
                {[['Current Password', 'cur'], ['New Password', 'new'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs text-surface-400 mb-1.5 block">{label}</label>
                    <div className="relative">
                      <input type={showPw[key] ? 'text' : 'password'} placeholder="••••••••"
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm placeholder-surface-600 focus:border-brand-500/60 transition-all" />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors">
                        {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <h2 className="text-base font-semibold text-white flex items-center gap-2"><Bell size={16} className="text-brand-400" /> Notification Preferences</h2>
                {[
                  ['newComplaints', 'New Complaint Alerts', 'Get notified when new complaints are registered.'],
                  ['emergencies', 'Emergency Alerts', 'Immediate notification for Emergency priority complaints.'],
                  ['workerUpdates', 'Worker Updates', 'When workers start or complete a task.'],
                  ['resolutions', 'Complaint Resolutions', 'When a complaint is marked as resolved.'],
                ].map(([key, label, desc]) => (
                  <div key={key} className="flex items-start justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-700/50">
                    <div>
                      <p className="text-white font-medium text-sm">{label}</p>
                      <p className="text-surface-500 text-xs mt-0.5">{desc}</p>
                    </div>
                    <button onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                      className={`relative w-10 h-5 rounded-full transition-all shrink-0 mt-0.5 ${notifPrefs[key] ? 'bg-brand-600' : 'bg-surface-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[key] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'system' && (
              <>
                <h2 className="text-base font-semibold text-white flex items-center gap-2"><Gauge size={16} className="text-brand-400" /> System Preferences</h2>
                <div className="flex items-start justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-700/50">
                  <div>
                    <p className="text-white font-medium text-sm">Auto-assign Complaints</p>
                    <p className="text-surface-500 text-xs mt-0.5">Automatically assign complaints to available workers.</p>
                  </div>
                  <button onClick={() => setSysPrefs(p => ({ ...p, autoAssign: !p.autoAssign }))}
                    className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${sysPrefs.autoAssign ? 'bg-brand-600' : 'bg-surface-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${sysPrefs.autoAssign ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1.5 block">Email Digest Frequency</label>
                  <select value={sysPrefs.emailDigest} onChange={e => setSysPrefs(p => ({ ...p, emailDigest: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm focus:border-brand-500/60 transition-all">
                    {['daily', 'weekly', 'never'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                  </select>
                </div>
              </>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-glow hover:shadow-glow-lg'}`}>
              <Save size={15} /> {saved ? 'Saved!' : 'Save Changes'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
