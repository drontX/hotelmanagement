import React from 'react';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { useAuthStore } from '@/store/authStore';
import { STAFF_DEFAULT_ROUTES } from '@/types';
import Bookings from '@/pages/Bookings';
import ChannelManager from '@/pages/ChannelManager';
import Dashboard from '@/pages/Dashboard';
import Housekeeping from '@/pages/Housekeeping';
import Invoices from '@/pages/Invoices';
import Login from '@/pages/Login';
import Reports from '@/pages/Reports';
import RoomMap from '@/pages/RoomMap';
import Settings from '@/pages/Settings';
import Staff from '@/pages/Staff';

interface RoleRouteProps {
  path: string;
  element: React.ReactElement;
}

function RoleProtectedRoute({ path, element }: RoleRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  const allowed = STAFF_DEFAULT_ROUTES[user.staffRole] || [];
  if (!allowed.includes(path)) {
    return <Navigate to={allowed[0] || '/login'} replace />;
  }
  return element;
}

function ProtectedShell() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayout />;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();
  const fallbackRoute = user ? STAFF_DEFAULT_ROUTES[user.staffRole]?.[0] || '/' : '/login';

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#b45309',
          colorInfo: '#1d4ed8',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#0f172a',
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#0f172a',
            darkSubMenuItemBg: '#0f172a',
            darkItemSelectedBg: '#b45309',
            darkItemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated && user ? <Navigate to={fallbackRoute} replace /> : <Login />}
        />
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<RoleProtectedRoute path="/" element={<Dashboard />} />} />
          <Route path="/room-map" element={<RoleProtectedRoute path="/room-map" element={<RoomMap />} />} />
          <Route path="/bookings" element={<RoleProtectedRoute path="/bookings" element={<Bookings />} />} />
          <Route path="/housekeeping" element={<RoleProtectedRoute path="/housekeeping" element={<Housekeeping />} />} />
          <Route path="/staff" element={<RoleProtectedRoute path="/staff" element={<Staff />} />} />
          <Route path="/channels" element={<RoleProtectedRoute path="/channels" element={<ChannelManager />} />} />
          <Route path="/reports" element={<RoleProtectedRoute path="/reports" element={<Reports />} />} />
          <Route path="/invoices" element={<RoleProtectedRoute path="/invoices" element={<Invoices />} />} />
          <Route path="/settings" element={<RoleProtectedRoute path="/settings" element={<Settings />} />} />
        </Route>
        <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
      </Routes>
    </ConfigProvider>
  );
}
