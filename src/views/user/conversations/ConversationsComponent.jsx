import React, { useEffect } from 'react';
import { ListGroup, Card } from 'react-bootstrap';
import { useAuth } from '../../../contexts/AuthContext';

const ConversationsComponent = ({
	conversations,
	title,
	onConversationSelect,
	selectedConversation,
	userType,
	listOfStaffIds,
}) => {
	const { authState } = useAuth();
	const userId = authState.userId;

	useEffect(() => {}, [conversations, userType]);

	const formatIsoDateString = (isoDateString) => {
		if (!isoDateString) return 'Date not available';
		const date = new Date(isoDateString);
		return new Intl.DateTimeFormat('en-GB', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			timeZone: 'UTC',
		}).format(date);
	};

	const getParticipantName = (conversation) => {
		return conversation.first_name || conversation.rescue_name || 'Unknown';
	};

	const sortedConversations = conversations.sort((a, b) => {
		const dateA = new Date(a.lastMessageAt);
		const dateB = new Date(b.lastMessageAt);
		return dateB - dateA;
	});

	console.log(conversations);

	return (
		<Card className='flex-grow-1 mb-sm-3' style={{ overflowY: 'none' }}>
			<Card.Header className='bg-dark text-white'>
				<span className='fs-5 fw-semibold'>{title}</span>
			</Card.Header>
			<ListGroup variant='flush'>
				{sortedConversations.map((conversation) => (
					<ListGroup.Item
						action
						key={conversation.conversation_id}
						onClick={() => {
							if (conversation.status !== 'closed') {
								onConversationSelect(conversation);
							}
						}}
						className={`d-flex align-items-center justify-content-between ${
							conversation.conversation_id ===
							selectedConversation?.conversation_id
								? 'bg-primary text-white'
								: conversation.status === 'closed'
								? 'bg-secondary text-muted'
								: ''
						}`}
						style={{
							cursor: conversation.status === 'closed' ? 'default' : 'pointer',
							opacity: conversation.status === 'closed' ? 0.6 : 1,
						}}
					>
						<div className='flex-grow-1 text-truncate'>
							<div className='fw-bold text-truncate'>
								{getParticipantName(conversation)} for {conversation.pet_name}
							</div>
							<div className='small text-truncate'>
								{conversation.last_message}
							</div>
						</div>
						<div className='text-nowrap'>
							{conversation.last_message_by !== userId &&
								(userType === 'rescue' ||
									!listOfStaffIds.includes(conversation.last_message_by)) &&
								conversation.unread_messages > 0 && (
									<div className='mb-2'>
										<span className='badge bg-secondary rounded-pill'>
											{conversation.unread_messages}
										</span>
									</div>
								)}

							<small>{formatIsoDateString(conversation.last_message_at)}</small>
						</div>
					</ListGroup.Item>
				))}
			</ListGroup>
		</Card>
	);
};

export default ConversationsComponent;
