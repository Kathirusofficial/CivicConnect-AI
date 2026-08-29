import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Building2, HardHat, MapPin,
  BarChart3, Bell, Users, Settings, LogOut, ChevronLeft,
  ChevronRight, Sparkles, Menu, X, Shield, BrainCircuit, Radio
} from 'lucide-react';
import { useAdminAuthStore } from '../../store/adminAuthStore';

const navItems = [
  { to: '/government/command-center', icon: Radio, label: 'Command Center', emoji: '🚨', badge: 'LIVE' },
  { to: '/government/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '🏠' },
  { to: '/government/complaints', icon: FileText, label: 'Complaints', emoji: '📋' },
  { to: '/government/departments', icon: Building2, label: 'Departments', emoji: '🏢' },
  { to: '/government/workers', icon: HardHat, label: 'Workers', emoji: '👷' },
  { to: '/government/map', icon: MapPin, label: 'Live Civic Map', emoji: '📍' },
  { to: '/government/analytics', icon: BarChart3, label: 'Analytics', emoji: '📊' },
  { to: '/government/predictive', icon: BrainCircuit, label: 'Predictive Intelligence', emoji: '🧠' },
  { to: '/government/predictions', icon: BrainCircuit, label: 'Predictive Planning', emoji: '🔮' },
  { to: '/government/notifications', icon: Bell, label: 'Notifications', emoji: '🔔' },
  { to: '/government/users', icon: Users, label: 'Users', emoji: '👤' },
  { to: '/government/settings', icon: Settings, label: 'Settings', emoji: '⚙️' },
];

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { adminLogout, adminUser } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminLogout();
    navigate('/government/login');
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/8 shrink-0 ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet shadow-glow flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {(!collapsed || mobile) && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
              <p className="font-bold text-white text-sm leading-tight whitespace-nowrap">CivicConnect AI</p>
              <p className="text-xs text-brand-400 flex items-center gap-1"><Sparkles size={9} /> Operations Portal</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
              ${isActive
                ? 'bg-gradient-to-r from-brand-600/30 to-accent-violet/20 text-white border border-brand-500/30 shadow-lg'
                : 'text-surface-400 hover:text-white hover:bg-white/5'
              } ${collapsed && !mobile ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div layoutId={`nav-indicator-${mobile ? 'mobile' : 'desktop'}`}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-brand-400" />
                )}
                <item.icon size={18} className={`shrink-0 ${isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'}`} />
                <AnimatePresence>
                  {(!collapsed || mobile) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center justify-between flex-1">
                      <span className="whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Tooltip on collapse */}
                {collapsed && !mobile && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-surface-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-surface-700/50">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/8 space-y-1 shrink-0">
        {(!collapsed || mobile) && adminUser && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-sm font-bold shrink-0">
              {adminUser.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminUser.name}</p>
              <p className="text-xs text-brand-400">{adminUser.role}</p>
            </div>
          </div>
        )}
        <button
          id="admin-logout-btn"
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all w-full ${collapsed && !mobile ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence>
            {(!collapsed || mobile) && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Logout</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-950 text-white">
      {/* Desktop Fixed Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 bg-surface-900/90 backdrop-blur-xl border-r border-white/5 overflow-hidden h-screen"
      >
        <SidebarContent />
        {/* Collapse Toggle */}
        <button
          id="sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-16 -right-3 z-40 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700 transition-all shadow-lg"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-surface-900 border-r border-white/5 flex flex-col"
          >
            <SidebarContent mobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[margin] duration-300 ease-in-out ${
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'
      }`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex items-center h-14 px-4 lg:px-6 gap-4 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
          <button id="mobile-menu-btn" onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          {/* Breadcrumb / Title is handled per page */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold">
              {adminUser?.name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm text-surface-300 hidden sm:block">{adminUser?.name}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
