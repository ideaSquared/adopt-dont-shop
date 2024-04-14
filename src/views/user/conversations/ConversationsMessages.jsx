import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container } from 'react-bootstrap';
import MessagesPetDisplay from './ConversationsMessagesPetDisplay';
import MessageList from './ConversationsMessageList';
import MessageInput from './ConversationsMessageInput';
import { useAuth } from '../../../contexts/AuthContext';

const MessagesComponent = ({
	conversation,
	onMessageSent,
	userType,
	canCreateMessages,
	listOfStaffIds,
}) => {
	const [messages, setMessages] = useState([]);
	const [petData, setPetData] = useState(null);
	const [message, setMessage] = useState('');
	const { authState } = useAuth();
	const userId = authState.userId;
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		if (conversation) {
			const fetchMessages = async () => {
				const messagesUrl = `${
					import.meta.env.VITE_API_BASE_URL
				}/conversations/messages/${conversation.conversation_id}`;
				const petDataUrl = `${import.meta.env.VITE_API_BASE_URL}/pets/${
					conversation.pet_id
				}`;
				try {
					const [messagesResponse, petDataResponse] = await Promise.all([
						axios.get(messagesUrl, { withCredentials: true }),
						axios.get(petDataUrl, { withCredentials: true }),
					]);
					setMessages(messagesResponse.data);
					setPetData(petDataResponse.data.data);
				} catch (error) {
					console.error('Error fetching data:', error);
				}
			};

			fetchMessages();
		}
	}, [conversation]);

	const handleSend = async (event) => {
		event.preventDefault();
		if (!message.trim()) return;

		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/${
					conversation.conversation_id
				}`,
				{
					messageText: message,
					conversationId: conversation.conversation_id,
					senderId: userId,
					sentAt: new Date(),
					status: 'sent',
				},
				{ withCredentials: true }
			);
			setMessages([...messages, response.data]);
			setMessage('');
			onMessageSent();
		} catch (error) {
			console.error('Error sending message:', error);
		}
	};

	if (!conversation) {
		return <div>Select a conversation to view messages.</div>;
	}

	console.log(messages);

	return (
		<Container fluid className='d-flex flex-column vh-100 p-2'>
			<MessagesPetDisplay
				petData={petData}
				isExpanded={isExpanded}
				toggleHeight={() => setIsExpanded(!isExpanded)}
			/>
			<MessageList
				messages={messages}
				userId={userId}
				userType={userType}
				listOfStaffIds={listOfStaffIds}
			/>
			<MessageInput
				message={message}
				setMessage={setMessage}
				canCreateMessages={canCreateMessages}
				handleSend={handleSend}
			/>
		</Container>
	);
};

export default MessagesComponent;
