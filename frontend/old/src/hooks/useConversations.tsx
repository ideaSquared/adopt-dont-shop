import { useState, useEffect, ChangeEvent } from 'react';
import { ConversationsService } from '../services/ConversationService';
import { Conversation } from '../types/conversation';

export const useConversations = () => {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [filteredConversations, setFilteredConversations] = useState<
		Conversation[]
	>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [selectedConversation, setSelectedConversation] =
		useState<Conversation | null>(null);
	const [messages, setMessages] = useState<any[]>([]);
	const [loadingMessages, setLoadingMessages] = useState(false);

	useEffect(() => {
		fetchAndSetConversations();
	}, [filterStatus, searchTerm]);

	const fetchAndSetConversations = async () => {
		try {
			const data = await ConversationsService.fetchConversations();
			setConversations(data);
			applyFilters(data);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			} else {
				alert('An unknown error occurred');
			}
		}
	};

	const applyFilters = (conversations: Conversation[]) => {
		const filtered = conversations.filter(
			(conversation) =>
				(!filterStatus || conversation.status === filterStatus) &&
				(!searchTerm ||
					conversation.participant_emails.some((email) =>
						email.toLowerCase().includes(searchTerm.toLowerCase())
					))
		);
		setFilteredConversations(filtered);
	};

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
		setFilterStatus(e.target.value);
	};

	const handleDeleteConversation = async (id: string) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this conversation?'
		);
		if (!isConfirmed) return;
		try {
			await ConversationsService.deleteConversation(id);
			fetchAndSetConversations();
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			} else {
				alert('An unknown error occurred');
			}
		}
	};

	const handleShowDetails = async (conversation: Conversation) => {
		setSelectedConversation(conversation);
		setLoadingMessages(true);
		try {
			const messagesData = await ConversationsService.fetchMessages(
				conversation.conversation_id
			);
			setMessages(messagesData);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			} else {
				alert('An unknown error occurred');
			}
		} finally {
			setLoadingMessages(false);
		}
	};

	const handleCloseModal = () => setSelectedConversation(null);

	return {
		filteredConversations,
		searchTerm,
		filterStatus,
		selectedConversation,
		messages,
		loadingMessages,
		handleSearchChange,
		handleFilterChange,
		handleDeleteConversation,
		handleShowDetails,
		handleCloseModal,
	};
};
