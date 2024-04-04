import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import CustomNavbar from '../components/layout/Navbar';
import HomePage from '../views/HomePage';

import AdminDashboard from '../views/admin/AdminDashboard';
import AdminUsers from '../views/admin/AdminUsers';
import AdminPets from '../views/admin/AdminPets';
import AdminRescues from '../views/admin/AdminRescues';
import AdminLogs from '../views/admin/AdminLogs';
import AdminConversation from '../views/admin/AdminConversations';

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

import RescueProfile from '../views/rescue/RescueProfile';
import Conversations from '../views/user/Conversations';
import UserSwiper from '../views/user/UserSwiper';

function App() {
	return (
		<Router>
			<CustomNavbar />
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/login' element={<LoginPage />} />
				<Route path='/create-account' element={<CreateAccountPage />} />
				<Route
					path='/create-rescue-account'
					element={<CreateRescueAccountPage />}
				/>
				<Route path='/forgot-password' element={<ForgotPasswordPage />} />
				<Route path='/reset-password' element={<ResetPasswordPage />} />
				<Route path='/my-profile' element={<UserProfilePage />} />
				<Route path='/admin' element={<AdminDashboard />} />
				<Route path='/admin/users' element={<AdminUsers />} />
				<Route path='/admin/pets' element={<AdminPets />} />
				<Route path='/admin/rescues' element={<AdminRescues />} />
				<Route path='/admin/logs' element={<AdminLogs />} />
				<Route path='/admin/conversations' element={<AdminConversation />} />
				{/* <Route path='/select-action' element={<PetActionSelection />} /> */}
				{/* <Route path='/select-account-type' element={<AccountTypeSelection />} /> */}
				{/* <Route path='/charity-form' element={<CharityForm />} /> */}
				{/* <Route path='/company-form' element={<CompanyForm />} /> */}
				{/* <Route path='/contact-us' element={<ContactUs />} /> */}
				<Route path='/rescue-profile' element={<RescueProfile />} />
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
			</Routes>
		</Router>
	);
}

export default App;
