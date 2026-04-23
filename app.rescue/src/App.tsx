import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spinner } from '@adopt-dont-shop/lib.components';

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
const Analytics = lazy(() => import('./pages/Analytics'));

import './App.css';

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}
  >
    <Spinner size="lg" label="Loading page" />
  </div>
);

function App() {
  return (
    <>
      {/* Public Routes */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

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
