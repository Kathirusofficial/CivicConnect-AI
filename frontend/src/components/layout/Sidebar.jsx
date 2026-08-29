import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, PlusCircle, FileText, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/citizen/new-complaint', icon: PlusCircle, label: 'Report Complaint' },
  { to: '/my-complaints', icon: FileText, label: 'My Complaints' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  const { logout } = useAuthStore();
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] glass border-r border-brand-200/30 dark:border-surface-700/30 p-4">
      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-500/10 to-accent-violet/10 text-brand-700 dark:from-brand-500/20 dark:to-accent-violet/20 dark:text-brand-400 border-l-2 border-brand-500'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={isActive ? 'text-brand-600 dark:text-brand-400' : ''}>
                  <link.icon size={18} />
                </div>
                <span className="flex-1">{link.label}</span>
                {isActive && (
                  <motion.div layoutId="sidebar-indicator">
                    <ChevronRight size={14} className="text-brand-500" />
                  </motion.div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-surface-200 dark:border-surface-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
