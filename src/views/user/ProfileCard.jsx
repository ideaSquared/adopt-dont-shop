import React, { useState } from 'react';
import { Card, Image, Button } from 'react-bootstrap';
import { PencilSquare } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import AccountProfileForm from '../../components/forms/AccountProfileForm';

const ProfileCard = ({ userData, updateUserDetails }) => {
	const [isEditing, setIsEditing] = useState(false);

	const handleEditClick = () => {
		setIsEditing(!isEditing);
	};

	return (
		<Card className='bg-light'>
			<Card.Body>
				<div className='d-flex justify-content-between align-items-center'>
					<Image
						src='https://via.placeholder.com/150'
						roundedCircle
						alt='Profile Photo'
						className='mb-3'
					/>
					<Button
						variant='info'
						style={{ position: 'absolute', top: '10px', right: '10px' }}
						onClick={handleEditClick}
					>
						<PencilSquare /> Edit my details
					</Button>
				</div>
				{isEditing ? (
					<AccountProfileForm
						initialData={userData}
						updateUserDetails={updateUserDetails}
					/>
				) : (
					<>
						<Card.Title>
							{userData.firstName || ''} {userData.lastName || ''}
						</Card.Title>
						<Card.Text>
							{userData.description ||
								"This person hasn't filled out a description but we're sure they're awesome!"}
						</Card.Text>
						<Card.Text>
							<small className='text-muted'>
								Location: {userData.city || ''}, {userData.country || ''}
							</small>
						</Card.Text>
					</>
				)}
			</Card.Body>
		</Card>
	);
};

export default ProfileCard;
