import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import DevLoginPanel from './components/dev/DevLoginPanel';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
);
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Rescues = lazy(() => import('./pages/Rescues'));
const Pets = lazy(() => import('./pages/Pets'));
const Applications = lazy(() => import('./pages/Applications'));
const Moderation = lazy(() => import('./pages/Moderation'));
const Support = lazy(() => import('./pages/Support'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Configuration = lazy(() => import('./pages/Configuration'));
const Audit = lazy(() => import('./pages/Audit'));
const Messages = lazy(() => import('./pages/Messages'));
const Reports = lazy(() => import('./pages/Reports'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const FieldPermissions = lazy(() => import('./pages/FieldPermissions'));
const ContentManagement = lazy(() => import('./pages/ContentManagement'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
    }}
  >
    <Spinner size='lg' label='Loading page' />
  </div>
);

const AdminApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // Public routes (authentication)
  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='*' element={<Navigate to='/login' replace />} />
          </Routes>
        </Suspense>

        <DevLoginPanel />
      </>
    );
  }

  // Protected routes (admin only)
  return (
    <>
      <ProtectedRoute>
        <AdminLayout>
          <Suspense fallback={<PageLoader />}>
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

              {/* Content Management */}
              <Route path='/content' element={<ContentManagement />} />

              {/* Field-Level Permissions */}
              <Route path='/field-permissions' element={<FieldPermissions />} />

              {/* Audit & Monitoring */}
              <Route path='/audit' element={<Audit />} />

              {/* Account Settings */}
              <Route path='/account' element={<AccountSettings />} />

              {/* Catch-all redirect */}
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>

      {/* Dev Login Panel - only shows in development */}
      <DevLoginPanel />
    </>
  );
};

export default AdminApp;
