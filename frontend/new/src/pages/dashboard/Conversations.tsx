import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	Table,
	Button,
} from '@adoptdontshop/components';
import { Conversation } from '@adoptdontshop/libs/conversations/Conversation';
import ConversationService from '@adoptdontshop/libs/conversations/ConversationService';

const Conversations: React.FC = () => {
	const [conversations, setConversations] = useState<Conversation[]>([]);
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

	// Filter conversations based on search term and filters
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
								<Button type='button'>View</Button>
								<Button type='button'>Close</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Conversations;
