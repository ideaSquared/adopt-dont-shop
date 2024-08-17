import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Home } from '@adoptdontshop/pages/landing';
import {
	Login,
	CreateAccount,
	ForgotPassword,
	ResetPassword,
	Settings,
} from '@adoptdontshop/pages/account';
import {
	Applications,
	Conversations,
	Ratings,
	Pets,
	Staff,
	Rescues,
	Rescue,
	Logs,
} from '@adoptdontshop/pages/dashboard';
import { Navbar } from '@adoptdontshop/components';
import { theme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';
import {
	PermissionProvider,
	Role,
	Permission,
	ProtectedRoute,
} from '@adoptdontshop/permissions';
import { Swipe } from '@adoptdontshop/pages/swipe';

const App: React.FC = () => {
	const TEST_userRoles: Role[] = [];
	const TEST_rescueRoles: Role[] = [
		Role.STAFF,
		Role.RESCUE_MANAGER,
		Role.STAFF_MANAGER,
		Role.PET_MANAGER,
		Role.COMMUNICATIONS_MANAGER,
		Role.APPLICATION_MANAGER,
	];
	const TEST_adminRoles: Role[] = [Role.ADMIN];

	return (
		<ThemeProvider theme={theme}>
			<PermissionProvider roles={TEST_rescueRoles}>
				<GlobalStyles />
				<Router>
					<Navbar />
					<Routes>
						<Route path='/' element={<Home />} />
						<Route path='/login' element={<Login />} />
						<Route path='/create-account' element={<CreateAccount />} />
						<Route path='/forgot-password' element={<ForgotPassword />} />
						<Route path='/reset-password' element={<ResetPassword />} />
						<Route path='/settings' element={<Settings />} />
						<Route path='/swipe' element={<Swipe />} />

						<Route
							element={
								<ProtectedRoute
									requiredPermission={Permission.VIEW_APPLICATIONS}
								/>
							}
						>
							<Route path='/applications' element={<Applications />} />
						</Route>
						<Route
							element={
								<ProtectedRoute requiredPermission={Permission.VIEW_PET} />
							}
						>
							<Route path='/ratings' element={<Ratings />} />
							<Route path='/pets' element={<Pets />} />
						</Route>
						<Route
							element={
								<ProtectedRoute requiredPermission={Permission.VIEW_STAFF} />
							}
						>
							<Route path='/staff' element={<Staff />} />
						</Route>
						<Route
							element={
								<ProtectedRoute
									requiredPermission={Permission.VIEW_RESCUE_INFO}
								/>
							}
						>
							<Route path='/rescue' element={<Rescue />} />
							<Route path='/rescues' element={<Rescues />} />
						</Route>
						<Route
							element={
								<ProtectedRoute requiredPermission={Permission.VIEW_MESSAGES} />
							}
						>
							<Route path='/conversations' element={<Conversations />} />
						</Route>
						<Route
							element={
								<ProtectedRoute
									requiredPermission={Permission.VIEW_DASHBOARD}
								/>
							}
						>
							<Route path='/logs' element={<Logs />} />
						</Route>
					</Routes>
				</Router>
			</PermissionProvider>
		</ThemeProvider>
	);
};

export default App;
