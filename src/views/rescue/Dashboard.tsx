import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../../components/rescue/Header';
import Sidebar from '../../components/rescue/Sidebar';
import Footer from '../../components/rescue/Footer';
import Adopters from './Adopters';
import Ratings from './Ratings';
import Pets from './Pets';
import Staff from './Staff';
import Settings from './Settings';

const Dashboard: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isVisible={showSidebar} />
        <div className={`flex-1 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-0'}`}>
          <main className="flex-1 p-4">
            <Routes>
              <Route path="adopters" element={<Adopters />} />
              <Route path="ratings" element={<Ratings />} />
              <Route path="pets" element={<Pets />} />
              <Route path="staff" element={<Staff />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
