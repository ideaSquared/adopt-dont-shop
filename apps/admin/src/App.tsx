import React, { ReactNode, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAuth, PermissionsProvider } from '@adopt-dont-shop/lib.auth';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { CookieBanner, LegalReacceptanceModal } from '@adopt-dont-shop/lib.legal';
import { permissionsService } from './services/libraryServices';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import DevLoginPanel from './components/dev/DevLoginPanel';
import ErrorBoundary from './components/ErrorBoundary';
import * as styles from './App.css';

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
const Inbox = lazy(() => import('./pages/Inbox'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const FieldPermissions = lazy(() => import('./pages/FieldPermissions'));
const ContentManagement = lazy(() => import('./pages/ContentManagement'));
const BroadcastNotifications = lazy(() => import('./pages/BroadcastNotifications'));
const PrivacyTools = lazy(() => import('./pages/PrivacyTools'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageLoader = () => (
  <div className={styles.pageLoader}>
    <Spinner size='lg' label='Loading page' />
  </div>
);

// ADS-482: route-level ErrorBoundary so a crash in one risky admin route
// (moderation, messages, audit, etc.) doesn't blank the whole dashboard.
const RouteBoundary = ({ name, children }: { name: string; children: ReactNode }) => (
  <ErrorBoundary boundary={name}>{children}</ErrorBoundary>
);

const AdminApp: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
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

        {import.meta.env.DEV && <DevLoginPanel />}

        {/* ADS-497 (slice 5): cookie banner is shown to anonymous visitors
            too, so first-time choices are persisted before sign-in. */}
        <CookieBanner />
      </>
    );
  }

  // Protected routes (admin only)
  return (
    <PermissionsProvider service={permissionsService}>
      <ProtectedRoute>
        <AdminLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth routes are not valid for signed-in users — bounce home.
                  This also covers the post-login transition: when the auth
                  state flips before LoginPage's navigate() runs, the URL
                  is still /login and would otherwise fall through to 404. */}
              <Route path='/login' element={<Navigate to='/' replace />} />
              <Route path='/register' element={<Navigate to='/' replace />} />

              {/* Main Dashboard */}
              <Route path='/' element={<Dashboard />} />

              {/* User Management — ADS-650: real split-pane entity-detail via
                  the shared EntityDetailLayout (the /users/split-pane demo has
                  been retired now the pattern ships on the live surface). */}
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

              {/* Triage Inbox (ADS-649) */}
              <Route
                path='/inbox'
                element={
                  <RouteBoundary name='inbox'>
                    <Inbox />
                  </RouteBoundary>
                }
              />

              {/* Content Moderation & Safety — wrapped in a route-level boundary */}
              <Route
                path='/moderation'
                element={
                  <RouteBoundary name='moderation'>
                    <Moderation />
                  </RouteBoundary>
                }
              />
              {/* legacy sub-routes redirect to single Moderation page */}
              <Route path='/moderation/queue' element={<Navigate to='/moderation' replace />} />
              <Route path='/moderation/reports' element={<Navigate to='/moderation' replace />} />
              <Route path='/moderation/sanctions' element={<Navigate to='/moderation' replace />} />
              {/* Deep-link to a specific report — opens its detail modal */}
              <Route
                path='/moderation/:reportId'
                element={
                  <RouteBoundary name='moderation'>
                    <Moderation />
                  </RouteBoundary>
                }
              />

              {/* Support System */}
              <Route path='/support' element={<Support />} />
              <Route path='/support/:ticketId' element={<Support />} />

              {/* Communication */}
              <Route
                path='/messages'
                element={
                  <RouteBoundary name='messages'>
                    <Messages />
                  </RouteBoundary>
                }
              />
              {/* Broadcast notifications — admin/super_admin only */}
              <Route
                path='/notifications/broadcast'
                element={
                  <ProtectedRoute requiredPermission='notifications.broadcast'>
                    <RouteBoundary name='broadcast'>
                      <BroadcastNotifications />
                    </RouteBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Analytics & Reporting */}
              <Route path='/analytics' element={<Analytics />} />
              <Route path='/reports' element={<Reports />} />
              <Route path='/reports/new' element={<ReportBuilderPage />} />
              <Route path='/reports/:id' element={<ReportViewPage />} />
              <Route path='/reports/:id/edit' element={<ReportBuilderPage />} />

              {/* System Configuration — admin/super_admin only */}
              <Route
                path='/configuration'
                element={
                  <ProtectedRoute requiredPermission='admin.config.update'>
                    <Configuration />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/configuration/features'
                element={
                  <ProtectedRoute requiredPermission='admin.config.update'>
                    <Configuration />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/configuration/settings'
                element={
                  <ProtectedRoute requiredPermission='admin.config.update'>
                    <Configuration />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/configuration/questions'
                element={
                  <ProtectedRoute requiredPermission='admin.config.update'>
                    <Configuration />
                  </ProtectedRoute>
                }
              />

              {/* Content Management */}
              <Route path='/content-management' element={<ContentManagement />} />

              {/* Field-Level Permissions — admin/super_admin only */}
              <Route
                path='/field-permissions'
                element={
                  <ProtectedRoute requiredPermission='admin.config.update'>
                    <FieldPermissions />
                  </ProtectedRoute>
                }
              />

              {/* Privacy / GDPR Tools — admin/super_admin only */}
              <Route
                path='/privacy-tools'
                element={
                  <ProtectedRoute requiredPermission='admin.data.export'>
                    <PrivacyTools />
                  </ProtectedRoute>
                }
              />

              {/* Audit & Monitoring — admin/super_admin only */}
              <Route
                path='/audit'
                element={
                  <ProtectedRoute requiredPermission='admin.audit.read'>
                    <Audit />
                  </ProtectedRoute>
                }
              />

              {/* Account Settings */}
              <Route path='/account' element={<AccountSettings />} />

              {/* Security Center (ADS-108) */}
              <Route path='/security' element={<SecurityCenter />} />
              <Route path='/security/:tab' element={<SecurityCenter />} />

              {/* Catch-all 404 */}
              <Route path='*' element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>

      {/* Dev Login Panel - only shows in development */}
      {import.meta.env.DEV && <DevLoginPanel />}

      {/* ADS-497 (slice 5): on-page cookie banner. Mounted before the
          re-acceptance modal so the modal stacks on top if both surface. */}
      <CookieBanner />

      {/* ADS-497: hard-block re-acceptance modal for users whose last
          accepted ToS / Privacy version is older than current. Admins are
          bound by the same documents as adopters. */}
      <LegalReacceptanceModal />
    </PermissionsProvider>
  );
};

export default AdminApp;
