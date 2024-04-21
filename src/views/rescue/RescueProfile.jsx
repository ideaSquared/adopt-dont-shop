import React, { useState, useEffect } from 'react';
import {
	Container,
	Row,
	Col,
	Nav,
	Navbar,
	Offcanvas,
	Form,
	Button,
	Card,
} from 'react-bootstrap';
import axios from 'axios';
import AlertComponent from '../../components/common/AlertComponent';
import { useAuth } from '../../contexts/AuthContext';
import { useRescueRedirect } from '../../hooks/useRescueRedirect';
import RescueProfileForm from '../../components/forms/RescueProfileForm';
import RescueProfileHeader from './RescueProfileHeader';
// import RescueStaffManagement from './RescueStaffManagement';
// import RescuePetManagement from '../../../_archive/RescuePetsManagement';
// import RescueAdopterManagement from './RescueAdopterManagement';

import AdopterManagement from './AdopterManagement';
import PetManagement from './PetsManagement';
import StaffManagement from './StaffManagement';
import RescueService from '../../services/RescueService';

import RescueNoPermissions from './RescueNoPermissions';
import Conversations from '../user/Conversations';

const RescueProfile = () => {
	const [rescueProfile, setRescueProfile] = useState({
		id: '',
		staff: [],
		rescueName: '',
		rescueType: '',
		// Update the address structure
		// addressLine1: '',
		// addressLine2: '',
		city: '',
		// county: '',
		// postcode: '',
		country: 'United Kingdom', // Default to UK, update accordingly if needed
		referenceNumber: '',
		referenceNumberVerified: false,
	});

	const { authState } = useAuth();
	const userId = authState.userId;

	const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
	const [activeSection, setActiveSection] = useState('profile');
	const [showSidebar, setShowSidebar] = useState(false);

	useRescueRedirect();

	useEffect(() => {
		const initFetch = async () => {
			try {
				const profileData = await RescueService.fetchRescueProfile();
				setRescueProfile(profileData);
			} catch (error) {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to load rescue profile. Please try again later.',
				});
			}
		};

		if (authState.isRescue) {
			initFetch();
		}
	}, [authState.isRescue]);

	const handleRescueInfoChange = (e) => {
		const { name, value } = e.target;
		setRescueProfile((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const saveUpdates = async () => {
		try {
			await RescueService.updateRescueProfile(
				rescueProfile.rescue_id,
				rescueProfile
			);
			setAlertInfo({
				type: 'success',
				message: 'Rescue profile updated successfully.',
			});
			// Optionally, fetch the updated profile here if not done automatically after update
		} catch (error) {
			setAlertInfo({
				type: 'danger',
				message: 'Failed to update rescue profile. Please try again later.',
			});
		}
	};

	const handleReferenceNumberSubmit = async () => {
		if (!rescueProfile.referenceNumber) {
			setAlertInfo({
				type: 'danger',
				message: 'Please enter a reference number to submit for verification.',
			});
			return;
		}

		try {
			const verificationResult =
				await RescueService.submitReferenceNumberForVerification(
					rescueProfile.rescue_id,
					rescueProfile.rescueType,
					rescueProfile.referenceNumber
				);
			// Update local state based on verificationResult
			if (verificationResult.referenceNumberVerified) {
				setAlertInfo({
					type: 'success',
					message: 'Reference number verified successfully.',
				});
			} else {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to verify reference number.',
				});
			}

			// Refresh the profile to get updated verification status
			const profileData = await RescueService.fetchRescueProfile();
			setRescueProfile(profileData);
		} catch (error) {
			setAlertInfo({
				type: 'danger',
				message:
					'Error submitting reference number for verification. Please try again later.',
			});
		}
	};

	// Check for permissions
	// TODO: Stop it being an array of an array
	const canViewRescueInfo =
		authState.userPermissions.includes('view_rescue_info');
	const canEditRescueInfo =
		authState.userPermissions.includes('edit_rescue_info');
	const canDeleteRescue = authState.userPermissions.includes('delete_rescue');
	const canViewStaff = authState.userPermissions.includes('view_staff');
	const canAddStaff = authState.userPermissions.includes('add_staff');
	const canEditStaff = authState.userPermissions.includes('edit_staff');
	const canVerifyStaff = authState.userPermissions.includes('verify_staff');
	const canDeleteStaff = authState.userPermissions.includes('delete_staff');
	const canViewPet = authState.userPermissions.includes('view_pet');
	const canAddPet = authState.userPermissions.includes('add_pet');
	const canEditPet = authState.userPermissions.includes('edit_pet');
	const canDeletePet = authState.userPermissions.includes('delete_pet');
	const canViewMessages = authState.userPermissions.includes('view_messages');
	const canCreateMessages =
		authState.userPermissions.includes('create_messages');

	const renderSection = () => {
		switch (activeSection) {
			case 'profile':
				if (canViewRescueInfo) {
					return (
						<>
							<RescueProfileHeader rescueProfile={rescueProfile} />
							<RescueProfileForm
								rescueProfile={rescueProfile}
								handleRescueInfoChange={handleRescueInfoChange}
								handleReferenceNumberSubmit={handleReferenceNumberSubmit}
								canEditRescueInfo={canEditRescueInfo}
								saveUpdates={saveUpdates}
							/>
						</>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'pets':
				if (canViewPet) {
					return (
						<PetManagement
							rescueId={rescueProfile.rescue_id}
							canAddPet={canAddPet}
							canEditPet={canEditPet}
							canDeletePet={canDeletePet}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'staff':
				if (canViewStaff) {
					return (
						<StaffManagement
							rescueProfile={rescueProfile}
							setRescueProfile={setRescueProfile}
							canAddStaff={canAddStaff}
							canEditStaff={canEditStaff}
							canVerifyStaff={canVerifyStaff}
							canDeleteStaff={canDeleteStaff}
							userId={userId}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'messages':
				if (canViewMessages) {
					return (
						<Conversations
							userType='Rescue'
							canCreateMessages={canCreateMessages}
							canReadMessages={canViewMessages}
						/>
					);
				}
			case 'adopter':
				if (canViewMessages) {
					return <AdopterManagement rescueId={rescueProfile.rescue_id} />;
				}
			default:
				return <RescueNoPermissions rescueProfile={rescueProfile} />;
		}
	};

	return (
		<>
			<Navbar
				bg='dark'
				variant='dark'
				expand={false}
				className='sticky-top flex-md-nowrap p-0 shadow d-md-none'
			>
				<Container fluid>
					<Navbar.Brand href='#' className='col-md-3 col-lg-2 me-0 px-3 '>
						{rescueProfile.rescueName}
					</Navbar.Brand>
					<Button
						variant='dark'
						onClick={() => setShowSidebar(true)}
						className='me-2'
					>
						<span>Menu</span>
					</Button>
				</Container>
			</Navbar>

			<Container fluid>
				<Row>
					<Col
						md={3}
						lg={2}
						className='d-none d-md-block p-0'
						style={{ height: '100vh' }}
					>
						<Nav
							className='flex-column'
							variant='pills'
							activeKey={activeSection}
							onSelect={(selectedKey) => setActiveSection(selectedKey)}
						>
							<Nav.Item>
								<Nav.Link eventKey='profile'>Rescue Profile</Nav.Link>
							</Nav.Item>
							<Nav.Item>
								<Nav.Link eventKey='pets'>Pet Management</Nav.Link>
							</Nav.Item>
							<Nav.Item>
								<Nav.Link eventKey='staff'>Staff Management</Nav.Link>
							</Nav.Item>
							<Nav.Item>
								<Nav.Link eventKey='adopter'>Adopter Management</Nav.Link>
							</Nav.Item>
							<Nav.Item>
								<Nav.Link eventKey='messages'>Messages</Nav.Link>
							</Nav.Item>
						</Nav>
					</Col>
					<Offcanvas
						show={showSidebar}
						onHide={() => setShowSidebar(false)}
						placement='start'
					>
						<Offcanvas.Header closeButton>
							<Offcanvas.Title>Menu</Offcanvas.Title>
						</Offcanvas.Header>
						<Offcanvas.Body>
							<Nav
								className='flex-column'
								variant='pills'
								activeKey={activeSection}
								onSelect={(selectedKey) => setActiveSection(selectedKey)}
							>
								<Nav.Item>
									<Nav.Link eventKey='profile'>Rescue Profile</Nav.Link>
								</Nav.Item>
								<Nav.Item>
									<Nav.Link eventKey='pets'>Pet Management</Nav.Link>
								</Nav.Item>
								<Nav.Item>
									<Nav.Link eventKey='staff'>Staff Management</Nav.Link>
								</Nav.Item>
								<Nav.Item>
									<Nav.Link eventKey='adopter'>Adopter Management</Nav.Link>
								</Nav.Item>
								<Nav.Item>
									<Nav.Link eventKey='messages'>Messages</Nav.Link>
								</Nav.Item>
							</Nav>
						</Offcanvas.Body>
					</Offcanvas>
					<Col xs={12} md={9} lg={10} className='bg-light p-2'>
						{alertInfo.message && (
							<AlertComponent
								type={alertInfo.type}
								message={alertInfo.message}
								onClose={() => setAlertInfo({ type: '', message: '' })}
							/>
						)}
						<Card>
							<Card.Body className='bg-info'>{renderSection()}</Card.Body>
						</Card>
					</Col>
				</Row>
			</Container>
		</>
	);
};

export default RescueProfile;
