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
				{/* Add more routes as needed */}
			</Routes>
		</Router>
	);
}

export default App;
