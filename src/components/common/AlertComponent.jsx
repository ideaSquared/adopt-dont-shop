import React from 'react';

const AlertComponent = ({
	type,
	message,
	onClose,
	hideCloseButton = false,
}) => {
	if (!message) return null; // Don't render if there's no message
	return (
		<div
			className={`alert alert-${type} alert-dismissible fade show`}
			role='alert'
		>
			{message}
			{!hideCloseButton && (
				<button
					type='button'
					className='btn-close'
					data-bs-dismiss='alert'
					aria-label='Close'
					onClick={onClose}
				></button>
			)}
		</div>
	);
};

export default AlertComponent;
