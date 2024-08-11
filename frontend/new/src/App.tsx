// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import Home from '@adoptdontshop/pages/Home';
import Users from '@adoptdontshop/pages/Users';
import Login from '@adoptdontshop/pages/user/Login';
import CreateAccount from '@adoptdontshop/pages/user/CreateAccount';
import ForgotPassword from '@adoptdontshop/pages/user/ForgotPassword';
import { Navbar } from '@adoptdontshop/components';
import ResetPassword from '@adoptdontshop/pages/user/ResetPassword';
import { theme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';
import Settings from '@adoptdontshop/pages/user/Settings';
import Applications from '@adoptdontshop/pages/dashboard/Applications';
import Conversations from '@adoptdontshop/pages/dashboard/Conversations';

const App: React.FC = () => {
	return (
		<ThemeProvider theme={theme}>
			<GlobalStyles />
			<Router>
				<Navbar />
				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/users' element={<Users />} />
					<Route path='/login' element={<Login />} />
					<Route path='/create-account' element={<CreateAccount />} />
					<Route path='/forgot-password' element={<ForgotPassword />} />
					<Route path='/reset-password' element={<ResetPassword />} />
					<Route path='/settings' element={<Settings />} />

					<Route path='/applications' element={<Applications />} />
					<Route path='/conversations' element={<Conversations />} />
				</Routes>
			</Router>
		</ThemeProvider>
	);
};

export default App;
