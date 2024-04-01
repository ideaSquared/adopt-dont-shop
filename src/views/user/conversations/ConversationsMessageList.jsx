import React from 'react';
import { Card, Badge } from 'react-bootstrap';

const MessageList = ({ messages, userType, userId, listOfStaffIds }) => (
	<div className='overflow-auto' style={{ flex: 1 }}>
		{messages.map((msg, index) => {
			// Determine if the message is from the current user or a rescue member
			const isUserMessage =
				(userType === 'User' && msg.senderId === userId) ||
				(userType === 'Rescue' && listOfStaffIds.includes(msg.senderId));

			return (
				<div
					key={index}
					className={`d-flex ${
						isUserMessage ? 'justify-content-end' : 'justify-content-start'
					}`}
				>
					<Card
						className={`mb-2 ${
							isUserMessage ? 'bg-light' : 'bg-secondary text-white'
						}`}
						style={{ minWidth: '35%', maxWidth: '75%' }}
					>
						<Card.Body>
							{msg.senderId !== userId && (
								<div
									className='text-muted text-end'
									style={{ fontSize: '0.9em' }}
								>
									<Badge bg='info'>{msg.senderName}</Badge>
								</div>
							)}
							<div style={{ whiteSpace: 'pre-wrap' }}>{msg.messageText}</div>
							<Card.Text
								className='text-muted text-end'
								style={{ fontSize: '0.8em' }}
							>
								{new Date(msg.sentAt).toLocaleTimeString()} {msg.status}
							</Card.Text>
						</Card.Body>
					</Card>
				</div>
			);
		})}
	</div>
);

export default MessageList;
