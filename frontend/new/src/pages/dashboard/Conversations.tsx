import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
	FormInput,
	SelectInput,
	TextInput,
	Table,
	Button,
	BaseSidebar,
} from '@adoptdontshop/components';
import {
	Conversation,
	Message,
} from '@adoptdontshop/libs/conversations/Conversation';
import ConversationService from '@adoptdontshop/libs/conversations/ConversationService';

// Styled Components

const ParticipantsTitle = styled.h3`
	font-size: 1.25rem;
	font-weight: 500;
	margin-bottom: 0.5rem;
`;

const ParticipantsContainer = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-bottom: 1rem;
`;

const ParticipantBadge = styled.span<{ color: string }>`
	// TODO: Make these work with theme
	background-color: ${(props) =>
		props.color === 'blue' ? '#ebf8ff' : '#f0fff4'};
	color: ${(props) => (props.color === 'blue' ? '#2c5282' : '#276749')};
	font-size: 0.875rem;
	font-weight: 500;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
`;

const MessagesTitle = styled.h3`
	font-size: 1.25rem;
	font-weight: 500;
	margin-top: 1rem;
	margin-bottom: 0.5rem;
`;

const MessageList = styled.ul`
	list-style-type: none;
	padding: 0;
	margin: 0;
`;

const MessageItem = styled.li`
	background-color: ${(props) => props.theme.background.contrast};
	padding: 0.5rem;
	border-radius: 0.25rem;
	margin-bottom: 0.5rem;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TimeStamp = styled.p`
	font-size: 0.75rem;
	color: ${(props) => props.theme.text.dim};
	margin-top: 0.25rem;
`;

const Conversations: React.FC = () => {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [selectedConversation, setSelectedConversation] =
		useState<Conversation | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<string | null>(null);

	useEffect(() => {
		const fetchedConversations = ConversationService.getConversations();
		setConversations(fetchedConversations);
	}, []);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleStatusFilterChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		setFilterStatus(e.target.value);
	};

	const handleViewConversation = (conversation: Conversation) => {
		setSelectedConversation(conversation);
		const fetchedMessages = ConversationService.getMessagesByConversationId(
			conversation.conversation_id
		);
		setMessages(fetchedMessages || []);
		setIsSidebarOpen(true);
	};

	const handleCloseSidebar = () => {
		setIsSidebarOpen(false);
		setSelectedConversation(null);
		setMessages([]);
	};

	const filteredConversations = conversations.filter((conversation) => {
		const matchesSearch =
			!searchTerm ||
			conversation.participant_emails.some((email) =>
				email.toLowerCase().includes(searchTerm.toLowerCase())
			) ||
			conversation.participant_rescues.some((rescue) =>
				rescue.toLowerCase().includes(searchTerm.toLowerCase())
			);
		const matchesStatus = !filterStatus || conversation.status === filterStatus;

		return matchesSearch && matchesStatus;
	});

	const filterOptions = [
		{ value: '', label: 'All' },
		{ value: 'open', label: 'Open' },
		{ value: 'closed', label: 'Closed' },
	];

	return (
		<div>
			<h1>Conversations</h1>
			<FormInput label='Search by participant email'>
				<TextInput
					value={searchTerm || ''}
					type='text'
					onChange={handleSearchChange}
				/>
			</FormInput>
			<FormInput label='Filter by status'>
				<SelectInput
					options={filterOptions}
					value={filterStatus}
					onChange={handleStatusFilterChange}
				/>
			</FormInput>
			<Table hasActions>
				<thead>
					<tr>
						<th>Started By</th>
						<th>Started At</th>
						<th>Last Message</th>
						<th>Status</th>
						<th>Unread Messages</th>
						<th>Participants</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{filteredConversations.map((conversation) => (
						<tr key={conversation.conversation_id}>
							<td>{conversation.started_by}</td>
							<td>{new Date(conversation.started_at).toLocaleString()}</td>
							<td>{conversation.last_message}</td>
							<td>{conversation.status}</td>
							<td>{conversation.unread_messages}</td>
							<td>
								<div>
									{conversation.participant_emails &&
									conversation.participant_emails.length > 0
										? conversation.participant_emails.join(', ')
										: 'No participants'}
									<br />
									{conversation.participant_rescues &&
									conversation.participant_rescues.length > 0
										? conversation.participant_rescues.join(', ')
										: 'No rescues'}
								</div>
							</td>
							<td>
								<Button
									type='button'
									onClick={() => handleViewConversation(conversation)}
								>
									View
								</Button>
								<Button type='button'>Close</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>

			<BaseSidebar
				show={isSidebarOpen}
				handleClose={handleCloseSidebar}
				title='Conversation Details'
				size='33%'
			>
				{selectedConversation && (
					<div>
						<ParticipantsTitle>Participants</ParticipantsTitle>
						<ParticipantsContainer>
							{selectedConversation.participant_emails.map((email, index) => (
								<ParticipantBadge key={index} color='blue'>
									{email}
								</ParticipantBadge>
							))}
							{selectedConversation.participant_rescues.map((rescue, index) => (
								<ParticipantBadge key={index} color='green'>
									{rescue}
								</ParticipantBadge>
							))}
						</ParticipantsContainer>
						<MessagesTitle>Messages</MessagesTitle>
						{messages.length === 0 ? (
							<p>No messages found.</p>
						) : (
							<MessageList>
								{messages
									.sort(
										(a, b) =>
											new Date(b.sent_at).getTime() -
											new Date(a.sent_at).getTime()
									)
									.map((message, index) => (
										<MessageItem key={index}>
											<p>
												<strong>{message.sender_name}:</strong>{' '}
												{message.message_text}
											</p>
											<TimeStamp>
												{new Date(message.sent_at).toLocaleString()}
											</TimeStamp>
										</MessageItem>
									))}
							</MessageList>
						)}
					</div>
				)}
			</BaseSidebar>
		</div>
	);
};

export default Conversations;
