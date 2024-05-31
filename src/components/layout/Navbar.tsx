import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import {
	PersonCircle,
	ChatRightText,
	BoxArrowRight,
	PlusCircle,
	HouseDoor,
	Briefcase,
	Eye,
} from 'react-bootstrap-icons';

const CustomNavbar: React.FC = () => {
	const { authState } = useAuth();
	const handleLogout = useLogout();
	const iconSize = 24; // Reduced the icon size for a more compact design

	return (
		<nav className='fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-lg'>
			<div className='flex justify-around items-center py-2'>
				{!authState.isLoggedIn ? (
					<>
						<Link
							to='/login'
							className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
						>
							<BoxArrowRight size={iconSize} />
							<span className='text-xs mt-1'>Login</span>
						</Link>
						<Link
							to='/create-account'
							className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
						>
							<PlusCircle size={iconSize} />
							<span className='text-xs mt-1'>Create Account</span>
						</Link>
					</>
				) : (
					<>
						<Link
							to='/'
							className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
						>
							<HouseDoor size={iconSize} />
							<span className='text-xs mt-1'>Home</span>
						</Link>
						<Link
							to='/adopter-conversations'
							className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
						>
							<ChatRightText size={iconSize} />
							<span className='text-xs mt-1'>Messages</span>
						</Link>
						<Link
							to='/my-profile'
							className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
						>
							<PersonCircle size={iconSize} />
							<span className='text-xs mt-1'>My Profile</span>
						</Link>
						{authState.isAdmin && (
							<Link
								to='/admin'
								className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
							>
								<Eye size={iconSize} />
								<span className='text-xs mt-1'>Admin</span>
							</Link>
						)}
						{authState.isRescue && (
							<Link
								to='/rescue-profile'
								className='nav-link flex flex-col items-center text-gray-700 hover:text-indigo-600 transition-colors'
							>
								<Briefcase size={iconSize} />
								<span className='text-xs mt-1'>Rescue Profile</span>
							</Link>
						)}
						<button
							onClick={handleLogout}
							className='nav-link flex flex-col items-center text-gray-700 hover:text-red-600 transition-colors focus:outline-none'
						>
							<BoxArrowRight size={iconSize} />
							<span className='text-xs mt-1'>Logout</span>
						</button>
					</>
				)}
			</div>
		</nav>
	);
};

export default CustomNavbar;
