import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.scss';
import CustomNavbar from '../components/layout/Navbar';
import HomePage from '../views/HomePage';
import EmailVerification from '../views/user/VerifyEmailPage';
import UserProfilePage from '../views/user/UserProfilePage';
import LoginPage from '../views/user/LoginPage';
import ForgotPasswordPage from '../views/user/ForgotPasswordPage';
import ResetPasswordPage from '../views/user/ResetPasswordPage';
import CreateAccountPage from '../views/user/CreateAccountPage';
import CreateRescueAccountPage from '../views/user/CreateRescueAccountPage';
import Dashboard from '../views/rescue/Dashboard'; 
import Conversations from '../views/user/Conversations';
import UserSwiper from '../views/user/UserSwiper';
import PreferencesManager from '../views/user/PreferencesManager';

const App: React.FC = () => {
  return (
    <Router>
      <CustomNavbar />
      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/create-rescue-account" element={<CreateRescueAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/my-profile" element={<UserProfilePage />} />
          <Route path="/rescue-profile/*" element={<Dashboard />} />
          <Route path="/rescue-conversations" element={<Conversations userType="Rescue" canCreateMessages canReadMessages />} />
          <Route path="/adopter-conversations" element={<Conversations userType="User" canCreateMessages canReadMessages />} />
          <Route path="/swipe" element={<UserSwiper />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/preferences" element={<PreferencesManager />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
