import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../../components/rescue/Header';
import Sidebar from '../../components/rescue/Sidebar';
import Footer from '../../components/rescue/Footer';
import Adopters from './Adopters';
import Ratings from './Ratings';
import Pets from './Pets';
import Staff from './Staff';
import Settings from './Settings';
import PrivateRoute from './PrivateRoute';
import useRescueProfile from '../../hooks/useRescueProfile'; // Adjust the path according to your project structure
import { useAuth } from '../../contexts/AuthContext'; // Adjust the path according to your project structure

const Dashboard: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const { authState, logout } = useAuth();
  const { rescueProfile, alertInfo } = useRescueProfile(authState);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (alertInfo) {
    // Handle the alert info here, e.g., show a notification
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isVisible={showSidebar} />
        <div className={`flex-1 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-0'}`}>
          <main className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<PrivateRoute />}>
                <Route path="adopters" element={<Adopters rescueProfile={rescueProfile} />} />
                <Route path="ratings" element={<Ratings rescueProfile={rescueProfile} />} />
                <Route path="pets" element={<Pets rescueProfile={rescueProfile} />} />
                <Route path="staff" element={<Staff rescueProfile={rescueProfile} />} />
                <Route path="settings" element={<Settings rescueProfile={rescueProfile} />} />
              </Route>
            </Routes>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
