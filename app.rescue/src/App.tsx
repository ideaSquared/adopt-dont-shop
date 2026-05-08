import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { useAnalyticsInvalidator } from '@adopt-dont-shop/lib.analytics';

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
const Communication = lazy(() => import('./pages/Communication'));
const Events = lazy(() => import('./pages/Events'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
// Reports (ADS-105)
const Reports = lazy(() => import('./pages/Reports'));
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));

import './App.css';

const PageLoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
`;

const PageLoader = () => (
  <PageLoaderContainer>
    <Spinner size="lg" label="Loading page" />
  </PageLoaderContainer>
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
                      <Route path="/applications" element={<Applications />} />
                      <Route path="/staff" element={<StaffManagement />} />
                      <Route path="/settings" element={<RescueSettings />} />
                      <Route path="/communication" element={<Communication />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/reports/new" element={<ReportBuilderPage />} />
                      <Route path="/reports/:id" element={<ReportViewPage />} />
                      <Route path="/reports/:id/edit" element={<ReportBuilderPage />} />
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
    </>
  );
}

export default App;
