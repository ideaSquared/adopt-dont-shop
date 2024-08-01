import React, { ChangeEvent, useState } from 'react';
import Table from '../../components/tables/Table';
import BaseSidebar from '../../components/sidebars/BaseSidebar';
import { useConversations } from '../../hooks/useConversations';
import conversationsColumns from '../../config/conversationsColumns';
import { Conversation } from '../../types/conversation';

const Conversations: React.FC = () => {
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	const {
		conversations,
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
	} = useConversations();

	const handleDetailsClick = async (conversation: Conversation) => {
		await handleShowDetails(conversation);
		setSidebarOpen(true);
	};

	const handleCloseSidebar = () => {
		handleCloseModal();
		setSidebarOpen(false);
	};

	const columns = conversationsColumns(
		handleDetailsClick,
		handleDeleteConversation
	);

	return (
		<div>
			<div className='mt-3 mb-3'>
				<div className='flex gap-4'>
					<input
						type='text'
						placeholder='Search by participant'
						value={searchTerm}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							handleSearchChange(e)
						}
						className='border p-2 rounded'
					/>
					<select
						value={filterStatus}
						onChange={(e: ChangeEvent<HTMLSelectElement>) =>
							handleFilterChange(e)
						}
						className='border p-2 rounded'
					>
						<option value=''>All</option>
						<option value='active'>Active</option>
						<option value='closed'>Closed</option>
					</select>
				</div>
			</div>
			<Table columns={columns} data={conversations} />
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

export default Conversations;
