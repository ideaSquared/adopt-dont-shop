import { Routes, Route } from 'react-router-dom';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import DevLoginPanel from './components/dev/DevLoginPanel';
import Layout from './components/shared/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import PetManagement from './pages/PetManagement';
import Applications from './pages/Applications';
import StaffManagement from './pages/StaffManagement';
import RescueSettings from './pages/RescueSettings';
import Communication from './pages/Communication';
import Events from './pages/Events';
import AcceptInvitation from './pages/AcceptInvitation';
import Analytics from './pages/Analytics';
import './App.css';

function App() {
  return (
    <>
      {/* Public Routes */}
      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        {/* Protected Routes */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout>
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
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Dev Login Panel - only shows in development */}
      <DevLoginPanel />
    </>
  );
}

export default App;
