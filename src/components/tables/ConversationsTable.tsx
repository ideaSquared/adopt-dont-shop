import React, { useState } from 'react';
import { Conversation } from '../../types/conversation';
import PaginationControls from '../common/PaginationControls';
import BaseSidebar from '../sidebars/BaseSidebar';
import { useConversations } from '../../hooks/useConversations';

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
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	const {
		selectedConversation,
		messages,
		loadingMessages,
		handleShowDetails,
		handleCloseModal,
	} = useConversations();

	const handleDetailsClick = async (conversation: Conversation) => {
		await handleShowDetails(conversation);
		setSidebarOpen(true);
	};

	const handleCloseSidebar = () => {
		handleCloseModal();
		setSidebarOpen(false);
	};

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
								{conversation.participant_emails &&
								conversation.participant_emails.length > 0
									? conversation.participant_emails.join(', ')
									: 'No participants'}
								<br />
								{conversation.participant_rescues &&
								conversation.participant_rescues.length > 0
									? conversation.participant_rescues.join(', ')
									: 'No rescues'}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								{conversation.status}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								<button
									onClick={() => handleDetailsClick(conversation)}
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

			<BaseSidebar
				show={isSidebarOpen}
				handleClose={handleCloseSidebar}
				title='Conversation Details'
				size='w-1/3'
			>
				{selectedConversation && (
					<div>
						<h3 className='text-lg font-medium mb-2'>Participants</h3>
						<div className='flex flex-wrap gap-2'>
							{selectedConversation.participant_emails.map((email, index) => (
								<span
									key={index}
									className='bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800'
								>
									{email}
								</span>
							))}
							{selectedConversation.participant_rescues.map((rescue, index) => (
								<span
									key={index}
									className='bg-green-100 text-green-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-800'
								>
									{rescue}
								</span>
							))}
						</div>
						<div className='flex flex-wrap gap-2'></div>
						<h3 className='text-lg font-medium mt-4 mb-2'>Messages</h3>
						{loadingMessages ? (
							<p>Loading messages...</p>
						) : (
							<ul className='space-y-2'>
								{messages
									.sort(
										(a, b) =>
											new Date(b.sent_at).getTime() -
											new Date(a.sent_at).getTime()
									)
									.map((message) => (
										<li
											key={message.message_id}
											className='bg-gray-50 p-2 rounded-lg shadow-sm'
										>
											<p className='text-sm'>
												<strong>{message.sender_email}:</strong>{' '}
												{message.message_text}
											</p>
											<p className='text-xs text-gray-500'>
												{new Date(message.sent_at).toLocaleString()}
											</p>
										</li>
									))}
							</ul>
						)}
					</div>
				)}
			</BaseSidebar>
		</div>
	);
};

export default ConversationsTable;
