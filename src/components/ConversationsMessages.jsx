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

const MessagesComponent = ({ conversation, onMessageSent }) => {
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

	const handleSend = async () => {
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
		} catch (error) {
			console.error('Error sending message:', error);
		}
	};

	if (!conversation) {
		return <div>Select a conversation to view messages.</div>;
	}

	return (
		<Container fluid className='d-flex flex-column vh-100 p-0'>
			<div className='overflow-auto' style={{ flex: 1 }}>
				{messages.map((msg, index) => (
					<Card
						className={`mb-2 ${
							msg.senderId === userId ? 'bg-light' : 'bg-secondary text-white'
						}`}
						style={{
							maxWidth: '75%',
							marginLeft: msg.senderId === userId ? 'auto' : '0',
						}}
						key={index}
					>
						<Card.Body>
							{msg.senderId !== userId && (
								<div className='text-end' style={{ fontSize: '0.9em' }}>
									<Badge bg='info'>{msg.senderName}</Badge>
								</div>
							)}
							<Card.Text>{msg.messageText}</Card.Text>
							<Card.Text
								className='text-muted'
								style={{ fontSize: '0.8em', textAlign: 'right' }}
							>
								{new Date(msg.sentAt).toLocaleTimeString()}
							</Card.Text>
						</Card.Body>
					</Card>
				))}
			</div>
			<Form className='mt-auto p-3'>
				<InputGroup className='mb-3'>
					<Form.Control
						type='text'
						placeholder='Enter message'
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						className='form-control-lg'
					/>
					<Button variant='primary' onClick={handleSend}>
						Send
					</Button>
				</InputGroup>
			</Form>
		</Container>
	);
};

export default MessagesComponent;
