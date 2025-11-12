import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import DevLoginPanel from './components/dev/DevLoginPanel';
import {
  LoginPage,
  RegisterPage,
  Dashboard,
  Users,
  Rescues,
  Pets,
  Applications,
  Moderation,
  Support,
  Analytics,
  Configuration,
  Audit,
  Messages,
  Reports,
} from './pages';

const AdminApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '1rem',
          color: '#6b7280',
        }}
      >
        Loading...
      </div>
    );
  }

  // Public routes (authentication)
  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='*' element={<Navigate to='/login' replace />} />
        </Routes>

        <DevLoginPanel />
      </>
    );
  }

  // Protected routes (admin only)
  return (
    <>
      <ProtectedRoute>
        <AdminLayout>
          <Routes>
            {/* Main Dashboard */}
            <Route path='/' element={<Dashboard />} />

            {/* User Management */}
            <Route path='/users' element={<Users />} />
            <Route path='/users/:userId' element={<Users />} />

            {/* Rescue Management */}
            <Route path='/rescues' element={<Rescues />} />
            <Route path='/rescues/:rescueId' element={<Rescues />} />

            {/* Pet Management */}
            <Route path='/pets' element={<Pets />} />
            <Route path='/pets/:petId' element={<Pets />} />

            {/* Application Management */}
            <Route path='/applications' element={<Applications />} />
            <Route path='/applications/:applicationId' element={<Applications />} />

            {/* Content Moderation & Safety */}
            <Route path='/moderation' element={<Moderation />} />
            <Route path='/moderation/queue' element={<Moderation />} />
            <Route path='/moderation/reports' element={<Moderation />} />
            <Route path='/moderation/sanctions' element={<Moderation />} />

            {/* Support System */}
            <Route path='/support' element={<Support />} />
            <Route path='/support/:ticketId' element={<Support />} />

            {/* Communication */}
            <Route path='/messages' element={<Messages />} />

            {/* Analytics & Reporting */}
            <Route path='/analytics' element={<Analytics />} />
            <Route path='/reports' element={<Reports />} />

            {/* System Configuration */}
            <Route path='/configuration' element={<Configuration />} />
            <Route path='/configuration/features' element={<Configuration />} />
            <Route path='/configuration/settings' element={<Configuration />} />
            <Route path='/configuration/questions' element={<Configuration />} />

            {/* Audit & Monitoring */}
            <Route path='/audit' element={<Audit />} />

            {/* Catch-all redirect */}
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </AdminLayout>
      </ProtectedRoute>

      {/* Dev Login Panel - only shows in development */}
      <DevLoginPanel />
    </>
  );
};

export default AdminApp;
