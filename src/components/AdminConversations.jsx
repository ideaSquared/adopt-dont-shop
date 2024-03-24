// Conversations.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';
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
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/conversations`;
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
						<td>
							{/* Actions like viewing details or deletion could go here */}
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Conversations;
