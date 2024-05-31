import React from 'react';
import StatusBadge from '../common/StatusBadge';
import PaginationControls from '../common/PaginationControls';

interface Conversation {
	conversation_id: string;
	participant_emails: string[];
	rescue_name?: string;
	last_message_by_email: string;
	updated_at: string;
	status?: string;
}

interface ConversationsTableProps {
	conversations: Conversation[];
	onDelete: (conversationId: string) => void;
	onShowDetails: (conversation: Conversation) => void;
	currentPage: number;
	totalPages: number;
	onChangePage: (page: number) => void;
}

const ConversationsTable: React.FC<ConversationsTableProps> = ({
	conversations,
	onDelete,
	onShowDetails,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	return (
		<>
			<table className='table-auto w-full'>
				<thead>
					<tr>
						<th className='border px-4 py-2'>Conversation ID</th>
						<th className='border px-4 py-2'>Participants</th>
						<th className='border px-4 py-2'>Rescue</th>
						<th className='border px-4 py-2'>Last Message</th>
						<th className='border px-4 py-2'>Last Message At</th>
						<th className='border px-4 py-2'>Status</th>
						<th className='border px-4 py-2'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{conversations.map((conversation) => (
						<tr
							key={conversation.conversation_id}
							style={{ cursor: 'pointer' }}
							onClick={() => onShowDetails(conversation)}
							className='hover:bg-gray-100'
						>
							<td className='border px-4 py-2'>
								{conversation.conversation_id}
							</td>
							<td className='border px-4 py-2'>
								{conversation.participant_emails.join(', ')}
							</td>
							<td className='border px-4 py-2'>
								{conversation.rescue_name || 'N/A'}
							</td>
							<td className='border px-4 py-2'>
								{conversation.last_message_by_email}
							</td>
							<td className='border px-4 py-2'>
								{new Date(conversation.updated_at).toLocaleString()}
							</td>
							<td className='border px-4 py-2'>
								<StatusBadge
									type='conversation'
									value={conversation.status || ''}
								/>
							</td>
							<td className='border px-4 py-2'>
								<button
									className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded focus:outline-none'
									onClick={(e) => {
										e.stopPropagation();
										onDelete(conversation.conversation_id);
									}}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</>
	);
};

export default ConversationsTable;
