import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
	Container,
	Form,
	Button,
	Card,
	Badge,
	InputGroup,
} from 'react-bootstrap';

const MessagesComponent = ({
	conversation,
	onMessageSent,
	userType,
	canCreateMessages,
	listOfStaffIds,
}) => {
	const [messages, setMessages] = useState([]);
	const [message, setMessage] = useState('');
	const userId = localStorage.getItem('userId');

	useEffect(() => {
		if (conversation) {
			const fetchMessages = async () => {
				try {
					const response = await axios.get(
						`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/${
							conversation._id
						}`,
						{ withCredentials: true }
					);
					setMessages(response.data);
				} catch (error) {
					console.error('Error fetching messages:', error);
				}
			};

			fetchMessages();
		}
	}, [conversation]);

	const handleSend = async (event) => {
		event.preventDefault(); // Prevent the default form submission behavior
		if (!message.trim()) return; // Prevent sending empty messages

		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/${
					conversation._id
				}`,
				{
					messageText: message,
					conversationId: conversation._id,
					senderId: userId,
					sentAt: new Date(),
					status: 'sent',
				},
				{ withCredentials: true }
			);

			setMessages([...messages, response.data]);

			setMessage(''); // Clear the input after sending
			onMessageSent(); // Trigger refresh of conversations list

			// Place navigation or page reloading logic here if needed,
			// after the request has successfully completed.
		} catch (error) {
			console.error('Error sending message:', error);
		}
	};

	if (!conversation) {
		return <div>Select a conversation to view messages.</div>;
	}

	console.log('TYPE: ', userType);

	return (
		<Container fluid className='d-flex flex-column vh-100 p-2'>
			{/* Message display area */}
			<div className='overflow-auto' style={{ flex: 1 }}>
				{messages.map((msg, index) => (
					<Card
						className={`mb-2 ${
							(userType === 'User' && msg.senderId === userId) ||
							(userType === 'Rescue' && listOfStaffIds.includes(msg.senderId))
								? 'bg-light'
								: 'bg-secondary text-white'
						}`}
						style={{
							maxWidth: '75%',
							marginLeft:
								(userType === 'User' && msg.senderId === userId) ||
								(userType === 'Rescue' && listOfStaffIds.includes(msg.senderId))
									? 'auto'
									: undefined,
							marginRight:
								(userType === 'User' && msg.senderId !== userId) ||
								(userType === 'Rescue' &&
									!listOfStaffIds.includes(msg.senderId))
									? 'auto'
									: undefined,
						}}
						key={index}
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
							<div
								style={{ whiteSpace: 'pre-wrap' }} // This CSS property preserves white spaces and line breaks
							>
								{msg.messageText}
							</div>
							<Card.Text
								className='text-muted text-end'
								style={{ fontSize: '0.8em' }}
							>
								{new Date(msg.sentAt).toLocaleTimeString()} {msg.status}
							</Card.Text>
						</Card.Body>
					</Card>
				))}
			</div>

			{/* Message input area */}
			<Form className='mt-auto p-3' onSubmit={handleSend}>
				<InputGroup className='mb-3'>
					<Form.Control
						as='textarea'
						placeholder='Enter message'
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						style={{ resize: 'none' }} // Prevent resizing the textarea
						disabled={!canCreateMessages} // Disable the input if canCreateMessages is false
					/>
					<Button variant='primary' type='submit' disabled={!canCreateMessages}>
						Send
					</Button>
				</InputGroup>
			</Form>
		</Container>
	);
};

export default MessagesComponent;
