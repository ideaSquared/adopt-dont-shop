// Conversations.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Container, Table, Modal, Form } from 'react-bootstrap';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import { useAuth } from '../../contexts/AuthContext';

axios.defaults.withCredentials = true;

const Conversations = () => {
	const { isAdmin } = useAuth(); // Extract isAdmin from your AuthContext
	useAdminRedirect(); // This will handle the redirection logic
	const [conversations, setConversations] = useState([]);
	const [filteredConversations, setFilteredConversations] = useState([]);
	const [messages, setMessages] = useState([]);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [conversationsPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);

	useEffect(() => {
		if (isAdmin) {
			fetchConversations();
		}
	}, [isAdmin, filterStatus, searchTerm]);

	const deleteConversation = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this conversation?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/conversations/${id}`
			);
			fetchConversations();
		} catch (error) {
			alert(
				'Failed to delete conversation. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	const fetchConversations = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/conversations`;
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
						conversation.participants.some((participant) =>
							participant.email.toLowerCase().includes(searchTerm.toLowerCase())
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

	const fetchMessages = async (conversationId) => {
		setLoadingMessages(true);
		const endpoint = `${
			import.meta.env.VITE_API_BASE_URL
		}/admin/conversations/${conversationId}/messages`; // Adjust endpoint as necessary
		try {
			const { data } = await axios.get(endpoint);
			const sortedData = data.sort(
				(a, b) => new Date(b.sentAt) - new Date(a.sentAt)
			);
			setMessages(sortedData); // Set the sorted messages to state
		} catch (error) {
			console.error('Failed to fetch messages:', error);
			alert('Failed to fetch messages for the selected conversation.');
		} finally {
			setLoadingMessages(false);
		}
	};

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
		fetchMessages(conversation._id);
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
							placeholder='Search by participant'
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
								style={{ cursor: 'pointer' }}
							>
								<td>
									{conversation.participants.map((participant, index) => (
										<React.Fragment key={index}>
											<StatusBadge
												type='conversation'
												value={
													participant.participantId.email ||
													participant.participantId.rescueName ||
													'Unknown'
												}
												caps={false}
											/>{' '}
										</React.Fragment>
									))}
								</td>
								<td>{conversation.lastMessage}</td>
								<td>{new Date(conversation.lastMessageAt).toLocaleString()}</td>
								<td>
									<StatusBadge
										type='conversation'
										value={conversation.status || ''}
									/>
								</td>
								<td>
									<Button
										variant='danger'
										onClick={(e) => {
											e.stopPropagation(); // Stop event propagation
											deleteConversation(conversation._id);
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

			{/* Modal for displaying selected conversation details */}
			<Modal show={showModal} onHide={handleCloseModal}>
				<Modal.Header closeButton>
					<Modal.Title>Conversation Details</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedConversation ? (
						<>
							<p>
								<strong>Participants:</strong>{' '}
								{selectedConversation.participants.map((participant, index) => (
									<React.Fragment key={index}>
										<StatusBadge
											type='conversation'
											value={
												participant.participantId.email ||
												participant.participantId.rescueName ||
												'Unknown'
											}
											caps={false}
										/>{' '}
									</React.Fragment>
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
								<strong>Started By:</strong>{' '}
								<StatusBadge
									type='conversation'
									value={selectedConversation.startedBy.email}
									caps={false}
								/>
							</p>
							<p>
								<strong>Last Message By:</strong>{' '}
								{
									<StatusBadge
										type='conversation'
										value={selectedConversation.lastMessageBy.email}
										caps={false}
									/>
								}
							</p>

							<p>
								<strong>Last Message:</strong>{' '}
								{selectedConversation.lastMessage}
							</p>
							<p>
								<strong>Last Message At:</strong>{' '}
								{new Date(selectedConversation.lastMessageAt).toLocaleString()}
							</p>
							<h5>Messages</h5>
							<Table striped bordered hover size='sm'>
								<thead>
									<tr>
										<th>Text</th>
										<th>Status</th>
										<th>Sent At</th>
									</tr>
								</thead>
								<tbody>
									{messages.map((message) => (
										<tr key={message._id}>
											<td>{message.messageText}</td>
											<td>{message.status}</td>
											<td>{new Date(message.sentAt).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</Table>
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
