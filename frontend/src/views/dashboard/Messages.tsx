// src/views/MessagesPage.tsx
import React from 'react';
import ConversationsWrapper from '../user/conversations/Conversations';
import { Rescue } from '../../types/rescue';

interface MessagesProps {
	rescueProfile: Rescue | null;
}

const MessagesPage: React.FC<MessagesProps> = ({ rescueProfile }) => {
	return (
		<div className='container mx-auto my-4'>
			<h1 className='text-2xl font-bold mb-4'>Conversations</h1>
			<ConversationsWrapper
				userType='Rescue'
				canCreateMessages={true}
				canReadMessages={true}
			/>
		</div>
	);
};

export default MessagesPage;
