import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Users from './pages/Users';
import Login from './pages/user/Login';
import CreateAccount from './pages/user/CreateAccount';
import ForgotPassword from './pages/user/ForgotPassword';
import Header from './components/layout/Header';

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
			</Routes>
		</Router>
	);
};

export default App;
