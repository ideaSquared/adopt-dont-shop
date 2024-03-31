import React, { useEffect, useState } from 'react';
import { ListGroup, Card } from 'react-bootstrap';

const ConversationsComponent = ({
	conversations,
	title,
	onConversationSelect,
	selectedConversation,
	userType,
	listOfStaffIds,
}) => {
	const userId = localStorage.getItem('userId');

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

	const getParticipantNames = (participants) => {
		return participants
			.filter((p) => p.participantId && p.participantType != userType)
			.map(
				(p) =>
					p.participantId?.rescueName || p.participantId?.firstName || 'Unknown'
			)
			.join(', ');
	};

	const sortedConversations = conversations.sort((a, b) => {
		const dateA = new Date(a.lastMessageAt);
		const dateB = new Date(b.lastMessageAt);
		return dateB - dateA;
	});

	return (
		<Card className='flex-grow-1' style={{ overflowY: 'auto' }}>
			<Card.Header className='bg-dark text-white'>
				<span className='fs-5 fw-semibold'>{title}</span>
			</Card.Header>
			<ListGroup variant='flush'>
				{sortedConversations.map((conversation) => (
					<ListGroup.Item
						action
						key={conversation._id}
						onClick={() => {
							if (conversation.status !== 'closed') {
								onConversationSelect(conversation);
							}
						}}
						className={`d-flex align-items-center justify-content-between ${
							conversation._id === selectedConversation?._id
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
						<div className='flex-grow-1'>
							<div className='fw-bold'>
								{getParticipantNames(conversation.participants)}
							</div>
							<div className='small'>{conversation.lastMessage}</div>
						</div>
						<div className='text-nowrap'>
							{conversation.lastMessageBy !== userId &&
								!listOfStaffIds.includes(conversation.lastMessageBy) &&
								conversation.unreadMessages > 0 && (
									<div className='mb-2'>
										<span className='badge bg-secondary rounded-pill'>
											{conversation.unreadMessages}
										</span>
									</div>
								)}
							<small>{formatIsoDateString(conversation.lastMessageAt)}</small>
						</div>
					</ListGroup.Item>
				))}
			</ListGroup>
		</Card>
	);
};

export default ConversationsComponent;
