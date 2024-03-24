import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import CustomNavbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import CreateAccountForm from './components/CreateAccountForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm';
import ChangeDetailsForm from './components/ChangeDetailsForm';
import HomePage from './components/HomePage';

import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import AdminPets from './components/AdminPets';
import AdminRescues from './components/AdminRescues';
import AdminLogs from './components/AdminLogs';
import AdminConversation from './components/AdminConversations';

import PetActionSelection from './components/PetActionSelection';
import AccountTypeSelection from './components/AccountTypeSelection';
import CharityForm from './components/CharityForm';
import CompanyForm from './components/CompanyForm';
import ContactUs from './components/ContactUs';

function App() {
	const [count, setCount] = useState(0);

	return (
		<Router>
			<CustomNavbar />
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/login' element={<LoginForm />} />
				<Route path='/create-account' element={<CreateAccountForm />} />
				<Route path='/forgot-password' element={<ForgotPasswordForm />} />
				<Route path='/reset-password' element={<ResetPasswordForm />} />
				<Route path='/change-details' element={<ChangeDetailsForm />} />
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
			</Routes>
		</Router>
	);
}

export default App;
