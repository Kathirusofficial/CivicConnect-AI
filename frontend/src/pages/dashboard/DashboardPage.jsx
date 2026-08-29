import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { CitizenDashboard } from './CitizenDashboard';

export const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const isGov = user?.role === 'Admin' || user?.role === 'Government' || user?.role === 'admin' || user?.role === 'government';
  
  if (isGov) {
    return <Navigate to="/government/dashboard" replace />;
  }

  return <CitizenDashboard />;
};
