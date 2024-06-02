import React, { useState } from 'react';
import { useAdminRedirect } from '../../../hooks/useAdminRedirect';
import Dashboard from './Dashboard';
import Conversations from './Conversations';
import Logs from './Logs';
import Pets from './Pets';
import Rescues from './Rescues';
import Users from './Users';
import Map from './Map';

const AdminLanding = () => {
	useAdminRedirect();
	const [view, setView] = useState('Dashboard');

	const changeView = (viewName) => {
		setView(viewName);
	};

	return (
		<div className='flex flex-col md:flex-row min-h-screen'>
			<div className='w-full md:w-1/5 bg-gray-100 p-4'>
				<h2 className='text-lg font-bold mb-4'>Navigation</h2>
				<button
					onClick={() => changeView('Dashboard')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Dashboard
				</button>
				<button
					onClick={() => changeView('Map')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Map
				</button>
				<button
					onClick={() => changeView('Users')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Users
				</button>
				<button
					onClick={() => changeView('Pets')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Pets
				</button>
				<button
					onClick={() => changeView('Rescues')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Rescues
				</button>
				<button
					onClick={() => changeView('Logs')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Logs
				</button>
				<button
					onClick={() => changeView('Conversations')}
					className='w-full py-2 my-1 bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Conversations
				</button>
			</div>
			<div className='w-full md:w-4/5 bg-white p-8'>
				<h1 className='text-2xl font-bold mb-6'>Admin Dashboard</h1>
				{view === 'Dashboard' && <Dashboard />}
				{view === 'Users' && <Users />}
				{view === 'Pets' && <Pets />}
				{view === 'Rescues' && <Rescues />}
				{view === 'Logs' && <Logs />}
				{view === 'Conversations' && <Conversations />}
				{view === 'Map' && <Map />}
			</div>
		</div>
	);
};

export default AdminLanding;
