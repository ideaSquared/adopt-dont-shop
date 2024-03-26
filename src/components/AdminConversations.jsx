// Conversations.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
	Button,
	Container,
	Table,
	Modal,
	Row,
	Col,
	Form,
	Badge,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PaginationControls from './PaginationControls';
import StatusBadge from './StatusBadge';

axios.defaults.withCredentials = true;

const Conversations = () => {
	const [conversations, setConversations] = useState([]);
	const [filteredConversations, setFilteredConversations] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [conversationsPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}

		const fetchConversations = async () => {
			const endpoint = `${
				import.meta.env.VITE_API_BASE_URL
			}/admin/conversations`;
			try {
				const { data } = await axios.get(endpoint);
				if (Array.isArray(data)) {
					// Directly filter and set conversations after fetching
					const filteredData = data.filter((conversation) => {
						// Check for status filter
						const statusMatch =
							!filterStatus || conversation.status === filterStatus;

						// Check for search term in subject or participants' emails
						const searchTermMatch =
							!searchTerm ||
							conversation.subject
								.toLowerCase()
								.includes(searchTerm.toLowerCase()) ||
							conversation.participants.some((participant) =>
								participant.email
									.toLowerCase()
									.includes(searchTerm.toLowerCase())
							);

						return statusMatch && searchTermMatch;
					});

					setConversations(filteredData);
					setFilteredConversations(filteredData); // You might only need one state if not filtering on the client side
				} else {
					console.error('Data is not an array:', data);
					setConversations([]);
					setFilteredConversations([]);
				}
			} catch (error) {
				alert('Failed to fetch conversations.');
				console.error(error);
			}
		};

		fetchConversations();
	}, [isAdmin, navigate, filterStatus, searchTerm]);

	const indexOfLastConversation = currentPage * conversationsPerPage;
	const indexOfFirstConversation =
		indexOfLastConversation - conversationsPerPage;
	const currentConversations = filteredConversations.slice(
		indexOfFirstConversation,
		indexOfLastConversation
	);
	const totalPages = Math.ceil(
		filteredConversations.length / conversationsPerPage
	);

	// Handle showing the modal with full conversation details
	const handleShowDetails = (conversation) => {
		setSelectedConversation(conversation);
		setShowModal(true);
	};

	// Define the function to close the modal
	const handleCloseModal = () => setShowModal(false);

	return (
		<>
			<Container fluid>
				<div className='mt-3 mb-3'>
					<Form>
						<Form.Control
							type='text'
							placeholder='Search by subject or participant'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className='mb-3'
						/>

						<Form.Select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className='mb-3'
						>
							<option value=''>Filter by Status</option>
							<option value='active'>Active</option>
							<option value='closed'>Closed</option>
						</Form.Select>
					</Form>
				</div>
				<Table striped bordered hover>
					<thead>
						<tr>
							<th>Subject</th>
							<th>Participants</th>
							<th>Last Message</th>
							<th>Last Message At</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{currentConversations.map((conversation) => (
							<tr
								key={conversation._id}
								onClick={() => handleShowDetails(conversation)}
							>
								<td>{conversation.subject}</td>
								<td>
									{conversation.participants.map((participant, index) => (
										<StatusBadge
											type='conversation'
											value={participant.email}
											caps={false}
										/>
									))}
								</td>
								<td>{conversation.lastMessage}</td>
								<td>{new Date(conversation.lastMessageAt).toLocaleString()}</td>
								<td>{conversation.status}</td>
								<td>
									<Button
										variant='danger'
										onClick={() => deleteConversation(conversation._id)}
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

			{/* Modal for displaying selected conversation details */}
			<Modal show={showModal} onHide={handleCloseModal}>
				<Modal.Header closeButton>
					<Modal.Title>Conversation Details</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedConversation ? (
						<>
							<p>
								<strong>Subject:</strong> {selectedConversation.subject}
							</p>
							<p>
								<strong>Participants:</strong>{' '}
								{selectedConversation.participants.map((participant, index) => (
									<StatusBadge
										type='conversation'
										value={participant.email}
										caps={false}
									/>
								))}
							</p>
							<p>
								<strong>Status:</strong>{' '}
								<StatusBadge
									type='conversation'
									value={selectedConversation.status}
								/>
							</p>
							<p>
								<strong>Last Message By:</strong>{' '}
								{selectedConversation.lastMessageBy}
							</p>
							<p>
								<strong>Last Message:</strong>{' '}
								{selectedConversation.lastMessage}
							</p>
							<p>
								<strong>Last Message At:</strong>{' '}
								{new Date(selectedConversation.lastMessageAt).toLocaleString()}
							</p>
							{/* Assuming you have a way to render or link to the full conversation or messages here */}
						</>
					) : (
						<p>Loading conversation details...</p>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant='secondary' onClick={handleCloseModal}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default Conversations;
