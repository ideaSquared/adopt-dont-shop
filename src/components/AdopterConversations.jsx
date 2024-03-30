import React from 'react';
import UserConversations from './UserConversations'; // Adjust the import path as necessary

const AdopterConversations = () => {
	return (
		<UserConversations userType='User' /> // or userType="Rescue" based on your requirement
	);
};

export default AdopterConversations;
