// src/components/layout/Sidebar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import featureFlagService from '../../services/FeatureFlagService';

interface SidebarProps {
	isVisible: boolean;
	isAdmin: boolean;
	isRescue: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, isAdmin, isRescue }) => {
	const isConversationsEnabled = featureFlagService.isFeatureEnabled(
		'enableConversations'
	);

	return (
		<aside
			className={`bg-gray-800 text-white w-64 p-4 fixed md:relative transform ${
				isVisible ? 'translate-x-0' : '-translate-x-full'
			} md:translate-x-0 transition-transform duration-300 ease-in-out`}
			id='sidebar'
		>
			<nav>
				<ul>
					{!isAdmin && (
						<>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/applications'>Applications</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/pets'>Pets</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/staff'>Staff</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/ratings'>Ratings</Link>
							</li>
							{isConversationsEnabled && (
								<li className='p-2 hover:bg-gray-700 cursor-pointer'>
									<Link to='/dashboard/messages'>Messages</Link>
								</li>
							)}
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/settings'>Settings</Link>
							</li>
						</>
					)}
					{isAdmin && (
						<>
							{isConversationsEnabled && (
								<li className='p-2 hover:bg-gray-700 cursor-pointer'>
									<Link to='/dashboard/conversations'>Conversations</Link>
								</li>
							)}
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/logs'>Logs</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/rescues'>Rescues</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/users'>Users</Link>
							</li>
						</>
					)}
				</ul>
			</nav>
		</aside>
	);
};

export default Sidebar;
