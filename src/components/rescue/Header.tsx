import React from 'react';

interface HeaderProps {
	isAdmin: boolean;
	toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, toggleSidebar }) => {
	return (
		<header className='bg-blue-500 text-white p-4 flex justify-between items-center'>
			<button id='menuButton' onClick={toggleSidebar} className='md:hidden'>
				Menu
			</button>
			<h1 className='text-2xl'>{isAdmin ? 'Admin' : 'Rescue'} Dashboard</h1>
		</header>
	);
};

export default Header;
