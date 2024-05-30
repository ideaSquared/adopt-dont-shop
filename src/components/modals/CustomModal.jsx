import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const CustomModal = ({ show, handleClose, children }) => {
	const [isBrowser, setIsBrowser] = useState(false);

	useEffect(() => {
		setIsBrowser(true);
	}, []);

	const modalContent = (
		<div
			className={`fixed inset-0 flex items-center justify-center ${
				show ? 'block' : 'hidden'
			}`}
		>
			<div className='fixed inset-0 bg-black opacity-50'></div>
			<div className='bg-white rounded-lg p-8 z-10'>
				<div className='flex justify-end'>
					<button
						onClick={handleClose}
						className='text-gray-500 hover:text-gray-700 focus:outline-none'
					>
						&times;
					</button>
				</div>
				<div>{children}</div>
			</div>
		</div>
	);

	if (isBrowser) {
		return ReactDOM.createPortal(
			modalContent,
			document.getElementById('modal-root')
		);
	} else {
		return null;
	}
};

export default CustomModal;
