// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import Home from './pages/Home';
import Users from './pages/Users';
import Login from './pages/user/Login';
import CreateAccount from '@adoptdontshop/pages/user/CreateAccount';
import ForgotPassword from '@adoptdontshop/pages/user/ForgotPassword';
import { Header } from '@adoptdontshop/components';
import ResetPassword from '@adoptdontshop/pages/user/ResetPassword';
import { lightTheme, darkTheme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';

const App: React.FC = () => {
	const [isDarkMode, setIsDarkMode] = useState(false);

	const toggleTheme = () => {
		setIsDarkMode(!isDarkMode);
	};

	return (
		<ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
			<GlobalStyles />
			<Router>
				<Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/users' element={<Users />} />
					<Route path='/login' element={<Login />} />
					<Route path='/create-account' element={<CreateAccount />} />
					<Route path='/forgot-password' element={<ForgotPassword />} />
					<Route path='/reset-password' element={<ResetPassword />} />
				</Routes>
			</Router>
		</ThemeProvider>
	);
};

export default App;
