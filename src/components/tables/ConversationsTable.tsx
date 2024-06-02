import React from 'react';
import { Conversation } from '../../types/conversation';
import PaginationControls from '../common/PaginationControls';

interface ConversationsTableProps {
	conversations: Conversation[];
	onDelete: (id: string) => void;
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
	const handlePageChange = (newPage: number) => {
		onChangePage(newPage);
	};

	return (
		<div>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Participants
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Status
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Actions
						</th>
					</tr>
				</thead>
				<tbody className='bg-white divide-y divide-gray-200'>
					{conversations.map((conversation) => (
						<tr key={conversation.conversation_id}>
							<td className='px-6 py-4 whitespace-nowrap'>
								{conversation.participants
									.map((participant) => participant.email)
									.join(', ')}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								{conversation.status}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								<button
									onClick={() => onShowDetails(conversation)}
									className='text-indigo-600 hover:text-indigo-900'
								>
									Details
								</button>
								<button
									onClick={() => onDelete(conversation.conversation_id)}
									className='text-red-600 hover:text-red-900 ml-4'
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
		</div>
	);
};

export default ConversationsTable;
