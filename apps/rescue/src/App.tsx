import { ReactNode, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { ErrorBoundary, NotFoundPage, Spinner } from '@adopt-dont-shop/lib.components';
import { captureException } from '@adopt-dont-shop/lib.observability';
import { CookieBanner, LegalReacceptanceModal } from '@adopt-dont-shop/lib.legal';
import {
  useAuth,
  ForgotPasswordPage,
  ResetPasswordPage,
  redirectTargetFromState,
} from '@adopt-dont-shop/lib.auth';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import DevLoginPanel from './components/dev/DevLoginPanel';
import Layout from './components/shared/Layout';

// Pages — lazily loaded for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PetManagement = lazy(() => import('./pages/PetManagement'));
const Applications = lazy(() => import('./pages/Applications'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const RescueSettings = lazy(() => import('./pages/RescueSettings'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const Communication = lazy(() => import('./pages/Communication'));
const FosterCoordination = lazy(() => import('./pages/FosterCoordination'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
// Reports (ADS-105)
const Reports = lazy(() => import('./pages/Reports'));
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));
const RegisterRescue = lazy(() => import('./pages/RegisterRescue'));

import * as styles from './AppRouting.css';

const PageLoader = () => (
  <div className={styles.pageLoader}>
    <Spinner size="lg" label="Loading page" />
  </div>
);

// ADS-482: route-level ErrorBoundary so a crash in one risky route (chat,
// applications, etc.) doesn't blank the whole rescue dashboard.
const RouteBoundary = ({ name, children }: { name: string; children: ReactNode }) => (
  <ErrorBoundary
    onError={(error, errorInfo) =>
      captureException(error, {
        app: 'rescue',
        boundary: name,
        componentStack: errorInfo.componentStack,
      })
    }
  >
    {children}
  </ErrorBoundary>
);

function App() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/register-rescue" element={<RegisterRescue />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
          </Routes>
        </Suspense>

        {import.meta.env.DEV && <DevLoginPanel />}
        <CookieBanner />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/register-rescue" element={<RegisterRescue />} />
          <Route
            path="/login"
            element={<Navigate to={redirectTargetFromState(location.state)} replace />}
          />
          {/* A reset link opened while signed in still resets the password. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      {/* /pets/:petId deep-links a pet: the list stays mounted
                          and the pet opens in its detail form. */}
                      <Route path="/pets/:petId?" element={<PetManagement />} />
                      {/* ADS D4: a single route serves both the list and the
                          deep-linkable detail (/applications/:id). Keeping one
                          route element means the master-detail page stays
                          mounted — and keeps its selection/filter state — as the
                          URL changes between list and detail. */}
                      <Route
                        path="/applications/:id?"
                        element={
                          <RouteBoundary name="applications">
                            <Applications />
                          </RouteBoundary>
                        }
                      />
                      <Route path="/staff" element={<StaffManagement />} />
                      <Route path="/settings" element={<RescueSettings />} />
                      <Route path="/user-settings" element={<UserSettings />} />
                      <Route
                        path="/communication"
                        element={
                          <RouteBoundary name="communication">
                            <Communication />
                          </RouteBoundary>
                        }
                      />
                      <Route path="/foster" element={<FosterCoordination />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/reports/new" element={<ReportBuilderPage />} />
                      <Route path="/reports/:id" element={<ReportViewPage />} />
                      <Route path="/reports/:id/edit" element={<ReportBuilderPage />} />
                      {/* ADS-480: 404 catch-all inside the protected subtree */}
                      <Route path="*" element={<NotFoundPage homeLabel="Back to dashboard" />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>

      {/* Dev Login Panel - only shows in development */}
      {import.meta.env.DEV && <DevLoginPanel />}

      {/* ADS-497 (slice 5): on-page cookie banner. Mounted before the
          re-acceptance modal so the modal stacks on top if both surface. */}
      <CookieBanner />

      {/* ADS-497: hard-block re-acceptance modal for users whose last
          accepted ToS / Privacy version is older than current. Rescue
          staff are bound by the same documents as adopters. */}
      <LegalReacceptanceModal />
    </>
  );
}

export default App;
