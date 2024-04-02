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

import LoginForm from '../components/forms/UserLoginForm';
import EmailVerification from '../views/user/UserVerifyEmail';
import ForgotPasswordForm from '../components/forms/UserForgotPasswordForm';
import ResetPasswordForm from '../components/forms/UserResetPasswordForm';
import UserMyProfile from '../views/user/UserMyProfile';

import CreateAccountForm from '../components/forms/CreateAccountForm';
import PetActionSelection from '../components/forms/CreateAccountPetActionSelection';
import AccountTypeSelection from '../components/forms/CreateAccountAccountTypeSelection';
import CharityForm from '../components/forms/CreateAccountCharityForm';
import CompanyForm from '../components/forms/CreateAccountCompanyForm';
import ContactUs from '../components/forms/CreateAccountContactUs';

import RescueProfile from '../views/rescue/RescueProfile';
import UserConversations from '../views/user/UserConversations';
import UserSwiper from '../views/user/UserSwiper';

function App() {
	return (
		<Router>
			<CustomNavbar />
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/login' element={<LoginForm />} />
				<Route path='/create-account' element={<CreateAccountForm />} />
				<Route path='/forgot-password' element={<ForgotPasswordForm />} />
				<Route path='/reset-password' element={<ResetPasswordForm />} />
				<Route path='/my-profile' element={<UserMyProfile />} />
				<Route path='/admin' element={<AdminDashboard />} />
				<Route path='/admin/users' element={<AdminUsers />} />
				<Route path='/admin/pets' element={<AdminPets />} />
				<Route path='/admin/rescues' element={<AdminRescues />} />
				<Route path='/admin/logs' element={<AdminLogs />} />
				<Route path='/admin/conversations' element={<AdminConversation />} />
				<Route path='/select-action' element={<PetActionSelection />} />
				<Route path='/select-account-type' element={<AccountTypeSelection />} />
				<Route path='/charity-form' element={<CharityForm />} />
				<Route path='/company-form' element={<CompanyForm />} />
				<Route path='/contact-us' element={<ContactUs />} />
				<Route path='/rescue-profile' element={<RescueProfile />} />
				<Route
					path='/rescue-conversations'
					element={<UserConversations userType='Rescue' />}
				/>
				<Route
					path='/adopter-conversations'
					element={
						<UserConversations
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
