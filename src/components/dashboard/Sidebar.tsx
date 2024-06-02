import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
	isVisible: boolean;
	isAdmin: boolean;
	isRescue: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, isAdmin, isRescue }) => {
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
								<Link to='/dashboard/adopters'>Adopters</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/staff'>Staff</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/ratings'>Ratings</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/settings'>Settings</Link>
							</li>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/messages'>Messages</Link>
							</li>
						</>
					)}
					{isAdmin && (
						<>
							<li className='p-2 hover:bg-gray-700 cursor-pointer'>
								<Link to='/dashboard/conversations'>Conversations</Link>
							</li>
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

					<li className='p-2 hover:bg-gray-700 cursor-pointer'>
						<Link to='/dashboard/pets'>Pets</Link>
					</li>
				</ul>
			</nav>
		</aside>
	);
};

export default Sidebar;
