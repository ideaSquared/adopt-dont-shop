import React, { ChangeEvent, useState } from 'react';
import { useConversations } from '../../hooks/useConversations';
import ConversationsTable from '../../components/tables/ConversationsTable';

const Conversations: React.FC = () => {
	const {
		conversations,
		totalPages,
		currentPage,
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
		setCurrentPage,
	} = useConversations();

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
			<ConversationsTable
				conversations={conversations}
				onDelete={handleDeleteConversation}
				onShowDetails={handleShowDetails}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
			{/* Uncomment and implement when ready */}
			{/* <ConversationDetailsModal
        showModal={Boolean(selectedConversation)}
        handleClose={handleCloseModal}
        conversation={selectedConversation}
        messages={messages}
        loadingMessages={loadingMessages}
      /> */}
		</div>
	);
};

export default Conversations;
