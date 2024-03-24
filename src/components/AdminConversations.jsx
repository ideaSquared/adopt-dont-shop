// Conversations.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Conversations = () => {
	const [conversations, setConversations] = useState([]);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchConversations();
	}, [isAdmin, navigate]);

	const fetchConversations = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/conversations`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setConversations(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setConversations([]);
			}
		} catch (error) {
			alert('Failed to fetch conversations.');
			console.error(error);
		}
	};

	const deleteConversation = async (id) => {
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/conversation/${id}`
			);
			fetchConversations(); // Refresh the list after deleting
		} catch (error) {
			alert(
				'Failed to delete conversation. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Conversation ID</th>
					<th>Participants</th>
					<th>Last Message</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{conversations.map((conversation) => (
					<tr key={conversation._id}>
						<td>{conversation._id}</td>
						<td>{conversation.participants.join(', ')}</td>
						<td>{conversation.lastMessage}</td>
						<Button
							variant='danger'
							onClick={() => deleteConversation(rescue._id)}
						>
							Delete
						</Button>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Conversations;
