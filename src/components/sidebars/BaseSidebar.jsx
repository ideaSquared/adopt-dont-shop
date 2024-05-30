import React from 'react';

const BaseSidebar = ({ show, handleClose, children, title, size = 'w-80' }) => {
	return (
		<div
			className={`fixed top-0 right-0 h-full bg-white shadow-lg transition-transform transform ${
				show ? 'translate-x-0' : 'translate-x-full'
			} ${size} z-50 flex flex-col`}
		>
			<div className='p-4 flex justify-between items-center border-b'>
				<h2 className='text-xl font-semibold'>{title}</h2>
				<button
					onClick={handleClose}
					className='text-gray-700 hover:text-gray-900 focus:outline-none'
				>
					Close
				</button>
			</div>
			<div className='p-4 overflow-y-auto flex-grow'>{children}</div>
		</div>
	);
};

export default BaseSidebar;
