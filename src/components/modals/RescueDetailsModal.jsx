import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const RescueDetailsModal = ({
	showModal,
	handleClose,
	rescueDetails,
	onDeleteStaff,
}) => {
	return (
		<Modal show={showModal} onHide={handleClose}>
			<Modal.Header closeButton>
				<Modal.Title>Rescue Details</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{rescueDetails ? ( // Use rescueDetails consistently
					<div>
						<h4>{rescueDetails.rescueName}</h4>
						<p>
							<b>Type:</b> {rescueDetails.rescueType}
						</p>
						<ul className='list-group'>
							{rescueDetails.staff.map((staffMember, index) => (
								<li
									key={index}
									className='list-group-item d-flex justify-content-between align-items-center'
								>
									{staffMember.userDetails?.email ?? 'Email not available'}
									<Button
										variant='danger'
										onClick={() =>
											onDeleteStaff(rescueDetails._id, staffMember.userId)
										}
									>
										Delete
									</Button>
								</li>
							))}
						</ul>
					</div>
				) : (
					<p>Loading details...</p>
				)}
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={handleClose}>
					{' '}
					Close
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default RescueDetailsModal;
