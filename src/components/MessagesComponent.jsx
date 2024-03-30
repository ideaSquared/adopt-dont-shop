import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Form, Button, ListGroup } from 'react-bootstrap';

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
		<Container>
			<ListGroup variant='flush'>
				{messages.map((msg, index) => (
					<ListGroup.Item key={index}>{msg.messageText}</ListGroup.Item>
				))}
			</ListGroup>
			<Form>
				<Form.Group className='mb-3' controlId='messageInput'>
					<Form.Control
						type='text'
						placeholder='Enter message'
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
				</Form.Group>
				<Button variant='primary' onClick={handleSend}>
					Send
				</Button>
			</Form>
		</Container>
	);
};

export default MessagesComponent;
