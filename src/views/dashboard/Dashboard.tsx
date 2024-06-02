import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../../components/rescue/Header';
import Sidebar from '../../components/rescue/Sidebar';
import Footer from '../../components/rescue/Footer';
import Adopters from './Adopters';
import Ratings from './Ratings';
import Pets from './Pets';
import Staff from './Staff';
import Settings from './Settings';
import Conversations from './Conversations';
import Logs from './Logs';
import Rescues from './Rescues';
import Users from './Users';
import PrivateRoute from './PrivateRoute';
import useRescueProfile from '../../hooks/useRescueProfile';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard: React.FC = () => {
	const [showSidebar, setShowSidebar] = useState(false);
	const { authState, logout } = useAuth();
	const { rescueProfile, alertInfo } = useRescueProfile(authState);

	const toggleSidebar = () => {
		setShowSidebar(!showSidebar);
	};

	if (alertInfo) {
		// Handle the alert info here, e.g., show a notification
	}

	return (
		<div className='min-h-screen bg-gray-100 flex flex-col'>
			<Header isAdmin={authState.isAdmin} toggleSidebar={toggleSidebar} />
			<div className='flex flex-1'>
				<Sidebar
					isVisible={showSidebar}
					isAdmin={authState.isAdmin}
					isRescue={authState.isRescue}
				/>
				<div
					className={`flex-1 transition-all duration-300 ${
						showSidebar ? 'ml-64' : 'ml-0'
					}`}
				>
					<main className='flex-1 p-4'>
						<Routes>
							<Route path='/' element={<PrivateRoute />}>
								<Route
									path='adopters'
									element={<Adopters rescueProfile={rescueProfile} />}
								/>
								<Route
									path='ratings'
									element={<Ratings rescueProfile={rescueProfile} />}
								/>
								<Route
									path='pets'
									element={
										<Pets
											rescueProfile={rescueProfile}
											userPermissions={authState.userPermissions}
											isAdmin={authState.isAdmin}
										/>
									}
								/>
								<Route
									path='staff'
									element={
										<Staff
											rescueProfile={rescueProfile}
											userPermissions={authState.userPermissions}
										/>
									}
								/>
								<Route
									path='settings'
									element={<Settings rescueProfile={rescueProfile} />}
								/>
								{authState.isAdmin && (
									<>
										<Route path='conversations' element={<Conversations />} />
										<Route path='logs' element={<Logs />} />
										<Route path='rescues' element={<Rescues />} />
										<Route path='users' element={<Users />} />
									</>
								)}
							</Route>
						</Routes>
					</main>
				</div>
			</div>
			<Footer />
		</div>
	);
};

export default Dashboard;
