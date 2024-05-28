import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.scss';
import CustomNavbar from '../components/layout/Navbar';
import HomePage from '../views/HomePage';

// import Dashboard from '../views/admin/Dashboard';
// import AdminDashboard from '../views/admin/Dashboard';
// import AdminUsers from '../views/admin/Users';
// import AdminPets from '../views/admin/Pets';
// import AdminRescues from '../views/admin/Rescues';
// import AdminLogs from '../views/admin/Logs';
// import AdminConversation from '../views/admin/Conversations';

// import LoginForm from '../components/forms/UserLoginForm';
import EmailVerification from '../views/user/VerifyEmailPage';
// import ForgotPasswordForm from '../components/forms/UserForgotPasswordForm';
// import ResetPasswordForm from '../components/forms/UserResetPasswordForm';
import UserProfilePage from '../views/user/UserProfilePage';

// import CreateAccountForm from '../components/forms/CreateAccountForm';
// import PetActionSelection from '../components/forms/CreateAccountPetActionSelection';
// import AccountTypeSelection from '../components/forms/CreateAccountAccountTypeSelection';
// import CharityForm from '../components/forms/CreateAccountCharityForm';
// import CompanyForm from '../components/forms/CreateAccountCompanyForm';
// import ContactUs from '../components/forms/CreateAccountContactUs';

import LoginPage from '../views/user/LoginPage';
import ForgotPasswordPage from '../views/user/ForgotPasswordPage';
import ResetPasswordPage from '../views/user/ResetPasswordPage';
import CreateAccountPage from '../views/user/CreateAccountPage';
import CreateRescueAccountPage from '../views/user/CreateRescueAccountPage';

import RescueDashboard from '../views/rescue/Dashboard';
import RescueProfile from '../views/rescue/RescueProfile';
import Conversations from '../views/user/Conversations';
import UserSwiper from '../views/user/UserSwiper';
import AdminLanding from '../views/admin/Landing';

import LandingFeatures from '../views/LandingFeatures';
import LandingPricing from '../views/LandingPricing';
import LandingFAQ from '../views/LandingFAQ';
import PreferencesManager from '../views/user/PreferencesManager';

function App() {
	return (
		<Router>
			<CustomNavbar />
			<div className='content-wrapper'>
				<Routes>
					<Route path='/' element={<HomePage />} />

					<Route path='/features' element={<LandingFeatures />} />
					<Route path='/pricing' element={<LandingPricing />} />
					<Route path='/faq' element={<LandingFAQ />} />

					<Route path='/login' element={<LoginPage />} />
					<Route path='/create-account' element={<CreateAccountPage />} />
					<Route
						path='/create-rescue-account'
						element={<CreateRescueAccountPage />}
					/>
					<Route path='/forgot-password' element={<ForgotPasswordPage />} />
					<Route path='/reset-password' element={<ResetPasswordPage />} />
					<Route path='/my-profile' element={<UserProfilePage />} />
					<Route path='/admin' element={<AdminLanding />} />
					{/* <Route path='/admin/users' element={<AdminUsers />} />
				<Route path='/admin/pets' element={<AdminPets />} />
				<Route path='/admin/rescues' element={<AdminRescues />} />
				<Route path='/admin/logs' element={<AdminLogs />} />
				<Route path='/admin/conversations' element={<AdminConversation />} /> */}
					{/* <Route path='/select-action' element={<PetActionSelection />} /> */}
					{/* <Route path='/select-account-type' element={<AccountTypeSelection />} /> */}
					{/* <Route path='/charity-form' element={<CharityForm />} /> */}
					{/* <Route path='/company-form' element={<CompanyForm />} /> */}
					{/* <Route path='/contact-us' element={<ContactUs />} /> */}
					<Route path='/rescue-profile' element={<RescueDashboard />} />
					<Route
						path='/rescue-conversations'
						element={<Conversations userType='Rescue' />}
					/>
					<Route
						path='/adopter-conversations'
						element={
							<Conversations
								userType='User'
								canCreateMessages={true}
								canReadMessages={true}
							/>
						}
					/>
					<Route path='/swipe' element={<UserSwiper />} />
					<Route path='/verify-email' element={<EmailVerification />} />
					<Route path='/preferences' element={<PreferencesManager />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;
