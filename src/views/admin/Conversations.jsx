import React, { useState, useEffect } from 'react';
import { Container, Table, Modal, Button } from 'react-bootstrap';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import { ConversationsService } from '../../services/ConversationService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import ConversationsTable from '../../components/tables/ConversationsTable';
import ConversationDetailsModal from '../../components/modals/ConversationDetailsModal';

const Conversations = () => {
	useAdminRedirect();

	const [conversations, setConversations] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [conversationsPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [messages, setMessages] = useState([]);
	const [loadingMessages, setLoadingMessages] = useState(false);

	useEffect(() => {
		fetchAndSetConversations();
	}, [filterStatus, searchTerm]);

	const fetchAndSetConversations = async () => {
		try {
			const data = await ConversationsService.fetchConversations();
			setConversations(data);
		} catch (error) {
			alert(error.message);
		}
	};

	const handleDeleteConversation = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this conversation?'
		);
		if (!isConfirmed) {
			return; // Stop if user cancels
		}
		try {
			await ConversationsService.deleteConversation(id);
			fetchAndSetConversations(); // Refresh list
		} catch (error) {
			alert(error.message);
		}
	};

	const handleShowDetails = async (conversation) => {
		setSelectedConversation(conversation);
		setShowModal(true);
		setLoadingMessages(true);
		try {
			const messagesData = await ConversationsService.fetchMessages(
				conversation._id
			);
			setMessages(messagesData);
		} catch (error) {
			alert(error.message);
		} finally {
			setLoadingMessages(false);
		}
	};

	const handleCloseModal = () => setShowModal(false);

	// Apply filters (if you prefer client-side filtering)
	const filteredConversations = conversations.filter(
		(conversation) =>
			(!filterStatus || conversation.status === filterStatus) &&
			(!searchTerm ||
				conversation.participants.some((participant) =>
					participant.email.toLowerCase().includes(searchTerm.toLowerCase())
				))
	);

	// Pagination logic
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

	const filters = [
		{
			type: 'text',
			label: 'Search by participant',
			value: searchTerm,
			onChange: (e) => setSearchTerm(e.target.value),
			md: 6,
			placeholder: 'Enter email or name',
		},
		{
			type: 'select',
			label: 'Filter by Status',
			value: filterStatus,
			onChange: (e) => setFilterStatus(e.target.value),
			options: [
				{ value: '', label: 'All' },
				{ value: 'active', label: 'Active' },
				{ value: 'closed', label: 'Closed' },
			],
			md: 6,
		},
	];

	return (
		<div>
			<div className='mt-3 mb-3'>
				<GenericFilterForm filters={filters} />
			</div>
			<ConversationsTable
				conversations={currentConversations}
				onDelete={handleDeleteConversation}
				onShowDetails={handleShowDetails}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>

			<ConversationDetailsModal
				showModal={showModal}
				handleClose={handleCloseModal}
				conversation={selectedConversation}
				messages={messages}
				loadingMessages={loadingMessages}
			/>
		</div>
	);
};

export default Conversations;
