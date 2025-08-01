import { Routes, Route } from 'react-router-dom';

// Contexts - AuthProvider is now in main.tsx
// Hot reload test - timestamp: ${new Date().toISOString()}

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
import './App.css';

function App() {
  return (
    <>
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
          </Routes>
        </Layout>
      </ProtectedRoute>
      {/* Dev Login Panel - only shows in development */}
      <DevLoginPanel />
    </>
  );
}

export default App;
