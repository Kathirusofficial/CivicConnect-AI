import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HardHat, LayoutDashboard, CheckSquare, History, User, Settings,
  LogOut, AlertTriangle, Menu, X, Shield, Clock, MapPin, ChevronRight, Phone
} from 'lucide-react';
import { useWorkerAuthStore } from '../../store/workerAuthStore';
import { workerApi } from '../../services/workerApi';

const navItems = [
  { to: '/worker/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/worker/tasks', icon: CheckSquare, label: 'My Tasks' },
  { to: '/worker/history', icon: History, label: 'History' },
  { to: '/worker/profile', icon: User, label: 'Profile' },
  { to: '/worker/settings', icon: Settings, label: 'Settings' },
];

export const WorkerLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const { workerUser, workerLogout } = useWorkerAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    workerApi.getDashboard()
      .then(res => {
        if (res.data?.summary?.emergency) {
          setEmergencyCount(res.data.summary.emergency);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    workerLogout();
    navigate('/worker/login');
  };

  const statusBadgeColor = {
    Available: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    Busy: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Offline: 'bg-surface-600/30 text-surface-400 border-surface-600/40'
  }[workerUser?.status || 'Available'];

  return (
    <div className="min-h-screen bg-[#0d1117] text-surface-100 flex flex-col font-sans">
      {/* Top Field Operations Header */}
      <header className="bg-[#161b22] border-b border-surface-800 sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-xl bg-surface-800 text-surface-200 hover:text-white"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-lg">
                <HardHat size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight">CivicConnect</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Field Worker</span>
                </div>
                <p className="text-[11px] text-surface-400 font-medium">Field Operations Portal</p>
              </div>
            </div>
          </div>

          {/* Worker Info & Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">{workerUser?.name || 'Field Operative'}</span>
              <span className="text-[11px] text-surface-400 font-mono">{workerUser?.employeeId || 'EMP-OPERATIONS'} • {workerUser?.department || 'Field Ops'}</span>
            </div>

            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${statusBadgeColor}`}>
              ● {workerUser?.status || 'Available'}
            </span>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-surface-800/80 hover:bg-red-500/20 text-surface-400 hover:text-red-300 border border-surface-700 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Active Banner */}
      {emergencyCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-2.5 shadow-lg border-b border-red-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs font-bold">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="animate-bounce" />
              <span>EMERGENCY DISPATCH: You have {emergencyCount} urgent task{emergencyCount > 1 ? 's' : ''} requiring immediate field response!</span>
            </div>
            <NavLink to="/worker/tasks?emergency=true" className="underline hover:text-red-100 flex items-center gap-1">
              View Emergency Queue <ChevronRight size={14} />
            </NavLink>
          </div>
        </div>
      )}

      {/* Main Field Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-60 p-4 border-r border-surface-800/80 bg-[#12161f] shrink-0 space-y-1">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider px-3 mb-2">Operations Menu</p>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 flex flex-col p-4">
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <span className="text-sm font-bold text-amber-400">Field Worker Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-surface-400"><X size={20} /></button>
            </div>
            <div className="py-4 space-y-2 flex-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-surface-300 hover:bg-surface-800'
                      }`
                    }
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
