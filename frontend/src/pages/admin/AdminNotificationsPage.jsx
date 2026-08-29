import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, UserCheck, CheckCircle2, ArrowUpRight, Inbox } from 'lucide-react';
import { notificationsAdminApi } from '../../services/adminApi';

const getIcon = (msg = '') => {
  if (msg.includes('Emergency') || msg.includes('emergency')) return AlertTriangle;
  if (msg.includes('resolved') || msg.includes('Resolved')) return CheckCircle2;
  if (msg.includes('assigned') || msg.includes('Worker')) return UserCheck;
  return Bell;
};
const getIconColor = (msg = '') => {
  if (msg.includes('Emergency') || msg.includes('emergency')) return 'text-red-400 bg-red-500/15';
  if (msg.includes('resolved') || msg.includes('Resolved')) return 'text-emerald-400 bg-emerald-500/15';
  if (msg.includes('assigned') || msg.includes('Worker')) return 'text-blue-400 bg-blue-500/15';
  return 'text-brand-400 bg-brand-500/15';
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const AdminNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    setLoading(true);
    notificationsAdminApi.getAll()
      .then(res => setNotifications(res.data.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try { await notificationsAdminApi.markRead(id); } catch {}
    setNotifications(p => p.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    try { await notificationsAdminApi.markAllRead(); } catch {}
    setNotifications(p => p.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={22} className="text-brand-400" /> Notifications
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">{unread} unread notifications</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 text-sm font-medium hover:bg-brand-600/30 transition-all">
            <CheckCheck size={15} /> Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <Inbox size={40} className="text-surface-600 mb-3" />
          <p className="text-surface-400 font-medium">All caught up!</p>
          <p className="text-surface-600 text-sm">No notifications to show.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((n, i) => {
              const Icon = getIcon(n.message);
              const iconStyle = getIconColor(n.message);
              return (
                <motion.div key={n._id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all ${!n.read ? 'border-brand-500/20' : 'border-white/5 opacity-70 hover:opacity-100'}`}
                  style={{ background: n.read ? 'rgba(25,16,39,0.4)' : 'rgba(25,16,39,0.7)', border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : 'rgba(147,51,234,0.25)'}` }}>
                  
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconStyle}`}>
                    <Icon size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${n.read ? 'text-surface-400' : 'text-white'}`}>{n.message}</p>
                    <p className="text-xs text-surface-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2 animate-pulse" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
