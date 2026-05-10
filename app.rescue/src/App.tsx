import { ReactNode, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { CookieBanner, LegalReacceptanceModal } from '@adopt-dont-shop/lib.legal';
import { useAnalyticsInvalidator } from '@adopt-dont-shop/lib.analytics';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import DevLoginPanel from './components/dev/DevLoginPanel';
import Layout from './components/shared/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages — lazily loaded for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PetManagement = lazy(() => import('./pages/PetManagement'));
const Applications = lazy(() => import('./pages/Applications'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const RescueSettings = lazy(() => import('./pages/RescueSettings'));
const Communication = lazy(() => import('./pages/Communication'));
const Events = lazy(() => import('./pages/Events'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
// Reports (ADS-105)
const Reports = lazy(() => import('./pages/Reports'));
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

import './App.css';
import * as styles from './AppRouting.css';

const PageLoader = () => (
  <div className={styles.pageLoader}>
    <Spinner size="lg" label="Loading page" />
  </div>
);

// ADS-482: route-level ErrorBoundary so a crash in one risky route (chat,
// applications, etc.) doesn't blank the whole rescue dashboard.
const RouteBoundary = ({ name, children }: { name: string; children: ReactNode }) => (
  <ErrorBoundary boundary={name}>{children}</ErrorBoundary>
);

function App() {
  // ADS-105: subscribe to backend analytics:invalidate events.
  useAnalyticsInvalidator();
  return (
    <>
      {/* Public Routes */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/pets" element={<PetManagement />} />
                      <Route
                        path="/applications"
                        element={
                          <RouteBoundary name="applications">
                            <Applications />
                          </RouteBoundary>
                        }
                      />
                      <Route path="/staff" element={<StaffManagement />} />
                      <Route path="/settings" element={<RescueSettings />} />
                      <Route
                        path="/communication"
                        element={
                          <RouteBoundary name="communication">
                            <Communication />
                          </RouteBoundary>
                        }
                      />
                      <Route path="/events" element={<Events />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/reports/new" element={<ReportBuilderPage />} />
                      <Route path="/reports/:id" element={<ReportViewPage />} />
                      <Route path="/reports/:id/edit" element={<ReportBuilderPage />} />
                      {/* ADS-480: 404 catch-all inside the protected subtree */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>

      {/* Dev Login Panel - only shows in development */}
      <DevLoginPanel />

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
