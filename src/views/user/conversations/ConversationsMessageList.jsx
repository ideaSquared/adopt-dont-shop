import React, { useRef, useEffect } from 'react';
import { Card, Badge } from 'react-bootstrap';

const MessageList = ({ messages, userType, userId, listOfStaffIds }) => {
	const messagesEndRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]); // Effect runs on messages update

	return (
		<div className='overflow-auto' style={{ flex: 1 }}>
			{messages.map((msg, index) => {
				const isUserMessage =
					(userType === 'User' && msg.sender_id === userId) ||
					(userType === 'Rescue' && listOfStaffIds.includes(msg.sender_id));
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
								<div
									className='text-muted text-end'
									style={{ fontSize: '0.9em' }}
								>
									<Badge bg='info'>{msg.sender_name}</Badge>
								</div>
								<div style={{ whiteSpace: 'pre-wrap' }}>{msg.message_text}</div>
								<Card.Text
									className='text-muted text-end'
									style={{ fontSize: '0.8em' }}
								>
									{new Date(msg.sent_at).toLocaleTimeString()} {msg.status}
								</Card.Text>
							</Card.Body>
						</Card>
						{/* Attach ref to the last message element */}
						{index === messages.length - 1 && <div ref={messagesEndRef} />}
					</div>
				);
			})}
		</div>
	);
};

export default MessageList;
