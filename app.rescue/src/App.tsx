import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/shared/Layout';
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
    <Router>
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
    </Router>
  );
}

export default App;
