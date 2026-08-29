import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AdminLayout } from '../components/admin/AdminLayout';
import { WorkerLayout } from '../components/worker/WorkerLayout';

// Citizen / Shared Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OTPVerificationPage } from '../pages/auth/OTPVerificationPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { NotFoundPage } from '../pages/auth/NotFoundPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { EditProfilePage } from '../pages/profile/EditProfilePage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { DepartmentDetailsPage } from '../pages/dashboard/DepartmentDetailsPage';
import { ComplaintDetailsPage } from '../pages/dashboard/ComplaintDetailsPage';
import { ComplaintsListPage } from '../pages/dashboard/ComplaintsListPage';
import { NewComplaintPage } from '../pages/dashboard/NewComplaintPage';

// Admin / Government Pages
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminComplaintsPage } from '../pages/admin/AdminComplaintsPage';
import { AdminComplaintDetailPage } from '../pages/admin/AdminComplaintDetailPage';
import { AdminDepartmentsPage } from '../pages/admin/AdminDepartmentsPage';
import { AdminWorkersPage } from '../pages/admin/AdminWorkersPage';
import { AdminMapPage } from '../pages/admin/AdminMapPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { AdminPredictiveIntelligencePage } from '../pages/admin/AdminPredictiveIntelligencePage';
import { AdminPredictionsPage } from '../pages/admin/AdminPredictionsPage';
import { AdminGovernanceCommandCenterPage } from '../pages/admin/AdminGovernanceCommandCenterPage';
import { AdminGovernanceIncidentPage } from '../pages/admin/AdminGovernanceIncidentPage';
import { AdminNotificationsPage } from '../pages/admin/AdminNotificationsPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

// Field Worker Pages
import { WorkerLoginPage } from '../pages/worker/WorkerLoginPage';
import { WorkerDashboardPage } from '../pages/worker/WorkerDashboardPage';
import { WorkerTasksPage } from '../pages/worker/WorkerTasksPage';
import { WorkerTaskDetailPage } from '../pages/worker/WorkerTaskDetailPage';
import { WorkerHistoryPage } from '../pages/worker/WorkerHistoryPage';
import { WorkerProfilePage } from '../pages/worker/WorkerProfilePage';
import { WorkerSettingsPage } from '../pages/worker/WorkerSettingsPage';

import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { useWorkerAuthStore } from '../store/workerAuthStore';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const GovernmentRoute = ({ children }) => {
  const { isAdminAuthenticated } = useAdminAuthStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const isGov = isAdminAuthenticated || (isAuthenticated && (user?.role === 'Admin' || user?.role === 'Government'));
  if (!isGov) {
    if (isAuthenticated && (user?.role === 'Citizen' || user?.role === 'citizen' || user?.role === 'user')) {
      return <Navigate to="/dashboard" replace />;
    }
    if (isAuthenticated && user?.role === 'Worker') {
      return <Navigate to="/worker/dashboard" replace />;
    }
    return <Navigate to="/government/login" replace />;
  }
  return children;
};

const CitizenRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'Admin' || user?.role === 'Government') {
    return <Navigate to="/government/dashboard" replace />;
  }
  if (user?.role === 'Worker') {
    return <Navigate to="/worker/dashboard" replace />;
  }
  return children;
};

const WorkerRoute = ({ children }) => {
  const { workerIsAuthenticated } = useWorkerAuthStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const isWorker = workerIsAuthenticated || (isAuthenticated && user?.role === 'Worker');
  if (!isWorker) {
    if (isAuthenticated && (user?.role === 'Admin' || user?.role === 'Government')) {
      return <Navigate to="/government/dashboard" replace />;
    }
    if (isAuthenticated && (user?.role === 'Citizen' || user?.role === 'citizen')) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/worker/login" replace />;
  }
  return children;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-otp', element: <OTPVerificationPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  // CITIZEN PORTAL
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <CitizenRoute><DashboardPage /></CitizenRoute> },
      { path: '/my-complaints', element: <CitizenRoute><ComplaintsListPage /></CitizenRoute> },
      { path: '/complaints', element: <CitizenRoute><ComplaintsListPage /></CitizenRoute> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/edit', element: <EditProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/complaints/:id', element: <ComplaintDetailsPage /> },
      { path: '/citizen/new-complaint', element: <CitizenRoute><NewComplaintPage /></CitizenRoute> },
    ],
  },
  // GOVERNMENT / MUNICIPAL OPERATIONS PORTAL
  {
    path: '/government/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin/login',
    element: <Navigate to="/government/login" replace />,
  },
  {
    element: (
      <GovernmentRoute>
        <AdminLayout />
      </GovernmentRoute>
    ),
    children: [
      // Government Routes
      { path: '/government/command-center', element: <AdminGovernanceCommandCenterPage /> },
      { path: '/government/incidents/:id', element: <AdminGovernanceIncidentPage /> },
      { path: '/government/dashboard', element: <AdminDashboardPage /> },
      { path: '/government/complaints', element: <AdminComplaintsPage /> },
      { path: '/government/complaints/:id', element: <AdminComplaintDetailPage /> },
      { path: '/government/departments', element: <AdminDepartmentsPage /> },
      { path: '/government/workers', element: <AdminWorkersPage /> },
      { path: '/government/map', element: <AdminMapPage /> },
      { path: '/government/analytics', element: <AdminAnalyticsPage /> },
      { path: '/government/predictive', element: <AdminPredictiveIntelligencePage /> },
      { path: '/government/predictions', element: <AdminPredictionsPage /> },
      { path: '/government/notifications', element: <AdminNotificationsPage /> },
      { path: '/government/users', element: <AdminUsersPage /> },
      { path: '/government/settings', element: <AdminSettingsPage /> },
      // Admin aliases
      { path: '/admin/command-center', element: <Navigate to="/government/command-center" replace /> },
      { path: '/admin/incidents/:id', element: <AdminGovernanceIncidentPage /> },
      { path: '/admin/dashboard', element: <Navigate to="/government/dashboard" replace /> },
      { path: '/admin/complaints', element: <Navigate to="/government/complaints" replace /> },
      { path: '/admin/complaints/:id', element: <AdminComplaintDetailPage /> },
      { path: '/admin/departments', element: <Navigate to="/government/departments" replace /> },
      { path: '/admin/workers', element: <Navigate to="/government/workers" replace /> },
      { path: '/admin/map', element: <Navigate to="/government/map" replace /> },
      { path: '/admin/analytics', element: <Navigate to="/government/analytics" replace /> },
      { path: '/admin/predictive', element: <Navigate to="/government/predictive" replace /> },
      { path: '/admin/predictions', element: <Navigate to="/government/predictions" replace /> },
      { path: '/admin/notifications', element: <Navigate to="/government/notifications" replace /> },
      { path: '/admin/users', element: <Navigate to="/government/users" replace /> },
      { path: '/admin/settings', element: <Navigate to="/government/settings" replace /> },
    ],
  },
  // FIELD WORKER PORTAL
  {
    path: '/worker/login',
    element: <WorkerLoginPage />,
  },
  {
    element: (
      <WorkerRoute>
        <WorkerLayout />
      </WorkerRoute>
    ),
    children: [
      { path: '/worker/dashboard', element: <WorkerDashboardPage /> },
      { path: '/worker/tasks', element: <WorkerTasksPage /> },
      { path: '/worker/tasks/:id', element: <WorkerTaskDetailPage /> },
      { path: '/worker/history', element: <WorkerHistoryPage /> },
      { path: '/worker/profile', element: <WorkerProfilePage /> },
      { path: '/worker/settings', element: <WorkerSettingsPage /> },
    ],
  },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
