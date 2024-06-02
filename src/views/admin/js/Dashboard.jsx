import React from 'react';
import { useAdminRedirect } from '../../../hooks/useAdminRedirect';
import Charts from './Charts';

const Dashboard = () => {
	useAdminRedirect();

	return (
		<div className='container mx-auto my-4'>
			<Charts />
		</div>
	);
};

export default Dashboard;
