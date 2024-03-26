import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Container, Table, Form, Modal } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PaginationControls from './PaginationControls';

axios.defaults.withCredentials = true;

const Rescues = () => {
	const [rescues, setRescues] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [rescuesPerPage] = useState(10); // Define how many rescues per page
	const [filterType, setFilterType] = useState('');
	const [searchName, setSearchName] = useState('');
	const [searchEmail, setSearchEmail] = useState('');
	const navigate = useNavigate();
	const { isAdmin } = useAuth();
	const location = useLocation();

	const [showModal, setShowModal] = useState(false);
	const [selectedRescueDetails, setSelectedRescueDetails] = useState(null);

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		const params = new URLSearchParams(location.search);
		const searchNameParam = params.get('searchName');
		if (searchNameParam) setSearchName(searchNameParam);
		fetchRescues();
	}, [isAdmin, location.search]);

	const fetchRescues = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/rescues`;
		try {
			const { data } = await axios.get(endpoint);
			setRescues(Array.isArray(data) ? data : []);
		} catch (error) {
			alert('Failed to fetch rescues.');
			console.error(error);
		}
	};

	const fetchRescueDetails = async (petId) => {
		try {
			const endpoint = `${
				import.meta.env.VITE_API_BASE_URL
			}/admin/rescues/${petId}`;
			const res = await axios.get(endpoint);
			setSelectedRescueDetails(res.data);
			setShowModal(true); // Show the modal with pet details
		} catch (error) {
			alert('Failed to fetch rescue details.');
			console.error(error);
		}
	};

	const deleteRescue = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this rescue?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/rescues/${id}`
			);
			fetchRescues(); // Refresh the list after deleting
		} catch (error) {
			alert(
				'Failed to delete rescue. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	const deleteStaffFromRescue = async (rescueId, staffId) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this staff member?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}

		try {
			await axios.delete(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/admin/rescues/${rescueId}/staff/${staffId}`
			);
			// Refresh the rescue details to reflect the deletion
			fetchRescueDetails(rescueId);
		} catch (error) {
			alert('Failed to delete staff member. Please try again.');
			console.error(error);
		}
	};

	// Adjust filteredRescues logic here if needed for pagination
	const filteredRescues = rescues
		.filter((rescue) => !filterType || rescue.rescueType === filterType)
		.filter(
			(rescue) =>
				!searchName ||
				rescue.rescueName?.toLowerCase().includes(searchName.toLowerCase())
		)
		.filter(
			(rescue) =>
				!searchEmail ||
				rescue.staff?.some((staffMember) =>
					staffMember.userDetails?.email
						.toLowerCase()
						.includes(searchEmail.toLowerCase())
				)
		);

	// Pagination logic
	const indexOfLastRescue = currentPage * rescuesPerPage;
	const indexOfFirstRescue = indexOfLastRescue - rescuesPerPage;
	const currentRescues = filteredRescues.slice(
		indexOfFirstRescue,
		indexOfLastRescue
	);
	const totalPages = Math.ceil(filteredRescues.length / rescuesPerPage);

	return (
		<>
			<Container fluid>
				<div className='mt-3 mb-3'>
					<Form>
						<Form.Group className='mb-3' controlId='filterType'>
							<Form.Label>Filter by Type</Form.Label>
							<Form.Control
								as='select'
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
							>
								<option value=''>All Types</option>
								<option value='Individual'>Individual</option>
								<option value='Charity'>Charity</option>
								<option value='Company'>Company</option>
							</Form.Control>
						</Form.Group>
						<Form.Group className='mb-3' controlId='searchName'>
							<Form.Label>Search by Name</Form.Label>
							<Form.Control
								type='text'
								placeholder='Search by rescue name'
								value={searchName}
								onChange={(e) => setSearchName(e.target.value)}
							/>
						</Form.Group>
						<Form.Group className='mb-3' controlId='searchEmail'>
							<Form.Label>Search by Staff Email</Form.Label>
							<Form.Control
								type='text'
								placeholder='Search by staff email'
								value={searchEmail}
								onChange={(e) => setSearchEmail(e.target.value)}
							/>
						</Form.Group>
					</Form>
				</div>
				<Table striped bordered hover>
					<thead>
						<tr>
							<th>Rescue Name</th>
							<th>Type</th>
							<th>Staff</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredRescues.map((rescue) => (
							<tr
								key={rescue._id}
								onClick={() => fetchRescueDetails(rescue._id)}
								style={{ cursor: 'pointer' }} // Add this line if you want to change the cursor on hover
							>
								<td>{rescue.rescueName ?? ''}</td>
								<td>{rescue.rescueType ?? 'Type Unavailable'}</td>
								<td>
									{rescue.staff.map((staffMember, index) => (
										<div key={index}>
											{staffMember.userDetails?.email ?? 'Email not available'}
										</div>
									))}
								</td>
								<td>
									<Button
										variant='danger'
										onClick={(e) => {
											e.stopPropagation(); // Stop event propagation
											deleteRescue(rescue._id);
										}}
									>
										Delete
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					onChangePage={setCurrentPage}
				/>
			</Container>
			<Modal show={showModal} onHide={() => setShowModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Rescue Details</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedRescueDetails ? (
						<div>
							<h4>{selectedRescueDetails.rescueName}</h4>
							<p>
								<b>Type:</b> {selectedRescueDetails.rescueType}
							</p>
							<ul className='list-group'>
								{selectedRescueDetails.staff.map((staffMember, index) => (
									<li
										key={index}
										className='list-group-item d-flex justify-content-between align-items-center'
									>
										{staffMember.userDetails?.email ?? 'Email not available'}
										<Button
											variant='danger'
											onClick={() =>
												deleteStaffFromRescue(
													selectedRescueDetails._id,
													staffMember.userId
												)
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
					<Button variant='secondary' onClick={() => setShowModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default Rescues;
