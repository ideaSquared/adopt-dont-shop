import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Users from './pages/Users';
import Login from './pages/user/Login';
import CreateAccount from '@adoptdontshop/pages/user/CreateAccount';
import ForgotPassword from '@adoptdontshop/pages/user/ForgotPassword';
import { Header } from '@adoptdontshop/components';
import ResetPassword from '@adoptdontshop/pages/user/ResetPassword';

const App: React.FC = () => {
	return (
		<Router>
			<Header />
			<Routes>
				<Route path='/' element={<Home />} />
				<Route path='/users' element={<Users />} />
				<Route path='/login' element={<Login />} />
				<Route path='/create-account' element={<CreateAccount />} />
				<Route path='/forgot-password' element={<ForgotPassword />} />
				<Route path='/reset-password' element={<ResetPassword />} />
			</Routes>
		</Router>
	);
};

export default App;
