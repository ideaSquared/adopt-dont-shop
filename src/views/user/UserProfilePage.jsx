import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';

const UserProfilePage = () => {
	const [initialData, setInitialData] = useState({});
	const { fetchUserDetails, updateUserDetails } = useAuth();

	useLoginRedirect();

	useEffect(() => {
		const initFetch = async () => {
			const userDetails = await fetchUserDetails();
			if (userDetails) {
				setInitialData({
					email: userDetails.email,
					firstName: userDetails.firstName,
					lastName: userDetails.lastName,
					city: userDetails.city,
					country: userDetails.country,
				});
			}
		};

		initFetch();
	}, []);

	return (
		<Container
			className='d-flex justify-content-center align-items-center'
			style={{ minHeight: '100vh' }}
		>
			<Row>
				<Col xs={12}>
					<Card className='bg-light'>
						<Card.Body>
							<div className='justify-content-md-center'>
								<AccountProfileForm
									initialData={initialData}
									updateUserDetails={updateUserDetails}
								/>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
};

export default UserProfilePage;
