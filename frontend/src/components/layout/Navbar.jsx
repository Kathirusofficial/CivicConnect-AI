import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Bell, Menu, X, ChevronDown, LogOut, User, Settings, Sparkles, CheckCheck } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { notificationAPI } from '../../services/api';

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();
  const { profile } = useUserStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationAPI.getAll();
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const markAllMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (n) => {
    if (!n.read) markReadMutation.mutate(n._id);
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass-strong border-b border-surface-200/50 dark:border-surface-700/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 12 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-magenta via-brand-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/30"
            >
              <Sparkles size={16} className="text-white" />
            </motion.div>
            <span className="font-display text-xl tracking-tight text-surface-900 dark:text-surface-50">
              Civic<span className="text-gradient">Connect</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-9 pr-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <div className="relative">
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 glass-strong rounded-2xl border border-surface-200/50 dark:border-surface-700/30 shadow-glass-lg overflow-hidden z-50"
                      >
                        <div className="p-3.5 border-b border-surface-200 dark:border-surface-700/50 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Notifications</h4>
                            <p className="text-[11px] text-surface-400">{unreadCount} unread</p>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllMutation.mutate()}
                              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                            >
                              <CheckCheck size={14} /> Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-surface-400">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n._id}
                                onClick={() => handleNotificationClick(n)}
                                className={`p-3 text-left cursor-pointer hover:bg-surface-100/70 dark:hover:bg-surface-800/70 transition-colors ${
                                  !n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {!n.read && (
                                    <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <p className={`text-xs ${!n.read ? 'font-semibold text-surface-900 dark:text-surface-50' : 'text-surface-600 dark:text-surface-400'}`}>
                                      {n.message}
                                    </p>
                                    <p className="text-[10px] text-surface-400 mt-1">
                                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="hidden md:block w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1" />
              </>
            )}
            <ThemeToggle />

            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-accent-violet flex items-center justify-center text-white text-sm font-semibold">
                    {profile?.fullName?.[0] || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-surface-700 dark:text-surface-300">
                    {profile?.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} className={`text-surface-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 glass-strong rounded-2xl border border-surface-200/50 dark:border-surface-700/30 shadow-glass-lg overflow-hidden"
                    >
                      <div className="p-3 border-b border-surface-200 dark:border-surface-700/50">
                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{profile?.fullName}</p>
                        <p className="text-xs text-surface-500 truncate">{profile?.email}</p>
                      </div>
                      <div className="p-1.5">
                        {[
                          { icon: User, label: 'Profile', path: '/profile' },
                          { icon: Settings, label: 'Settings', path: '/settings' },
                        ].map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="p-1.5 border-t border-surface-200 dark:border-surface-700/50">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
                        >
                          <LogOut size={16} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-surface-200 dark:border-surface-700/50 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Profile', path: '/profile' },
                    { label: 'Settings', path: '/settings' },
                  ].map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 text-center hover:bg-brand-700 transition-colors">
                    Get started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
