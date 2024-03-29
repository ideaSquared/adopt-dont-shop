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
} from 'react-bootstrap';
import axios from 'axios';
import AlertComponent from './AlertComponent';
import { useAuth } from './AuthContext';
import { useRescueRedirect } from './hooks/useRescueRedirect';
import RescueProfileForm from './RescueProfileForm';
import RescueProfileHeader from './RescueProfileHeader';
import RescueStaffManagement from './RescueStaffManagement';
import RescuePetManagement from './RescuePetsManagement';
import RescueNoPermissions from './RescueNoPermissions';

const RescueProfile = () => {
	const [rescueProfile, setRescueProfile] = useState({
		id: '',
		staff: [],
		rescueName: '',
		rescueType: '',
		rescueAddress: '',
		referenceNumber: '',
		referenceNumberVerified: false,
	});
	const { userPermissions, isRescue } = useAuth();
	const userId = localStorage.getItem('userId');

	const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
	const [activeSection, setActiveSection] = useState('profile');
	const [showSidebar, setShowSidebar] = useState(false);

	useRescueRedirect();

	useEffect(() => {
		if (isRescue) {
			fetchRescueProfile();
		}
	}, [isRescue]);

	const fetchRescueProfile = async () => {
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/my-rescue`,
				{
					withCredentials: true,
				}
			);
			setRescueProfile(response.data);
		} catch (error) {
			console.error('Error fetching rescue profile:', error);
		}
	};

	// Calculate unique permissions for table headers
	const uniquePermissions = Array.from(
		new Set(rescueProfile.staff.flatMap((staff) => staff.permissions))
	);

	const handleRescueInfoChange = (e) => {
		const { name, value } = e.target;
		setRescueProfile((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const updateRescueProfile = async (rescueId, updates) => {
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${rescueId}`,
				updates,
				{ withCredentials: true }
			);
			// console.log('Rescue profile updated successfully:', response.data);
			// Optionally, refresh the local data to reflect the update
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error updating rescue profile:',
				error.response?.data || error.message
			);
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
			// Adjust the URL and request method according to your actual backend endpoint and its requirements
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${
					rescueProfile.id
				}/${rescueProfile.rescueType.toLowerCase()}/validate`,
				{ referenceNumber: rescueProfile.referenceNumber.trim() }, // Or send as query params as per your API
				{ withCredentials: true }
			);

			if (response.data.data.referenceNumberVerified) {
				setAlertInfo({
					type: 'success',
					message: 'Reference number verified successfully.',
				});
				setRescueProfile((prev) => ({
					...prev,
					referenceNumberVerified: true,
				}));
			} else {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to verify reference number.',
				});
				setRescueProfile((prev) => ({
					...prev,
					referenceNumberVerified: false,
				}));
			}
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error submitting reference number for verification:',
				error
			);
			setAlertInfo({
				type: 'danger',
				message:
					'Error submitting reference number for verification. Please try again later.',
			});
		}
	};

	const saveUpdates = () => {
		// Assuming `rescueProfile` contains the updated rescue profile data
		updateRescueProfile(rescueProfile.id, rescueProfile);
	};

	// Check for permissions
	const canViewRescueInfo = userPermissions.includes('view_rescue_info');
	const canEditRescueInfo = userPermissions.includes('edit_rescue_info');
	const canViewStaff = userPermissions.includes('view_staff');
	const canAddStaff = userPermissions.includes('add_staff');
	const canEditStaff = userPermissions.includes('edit_staff');
	const canVerifyStaff = userPermissions.includes('verify_staff');
	const canDeleteStaff = userPermissions.includes('delete_staff');
	const canViewPet = userPermissions.includes('view_pet');
	const canAddPet = userPermissions.includes('add_pet');
	const canEditPet = userPermissions.includes('edit_pet');
	const canDeletePet = userPermissions.includes('delete_pet');

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
						<RescuePetManagement
							rescueId={rescueProfile.id}
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
						<RescueStaffManagement
							rescueProfile={rescueProfile}
							setRescueProfile={setRescueProfile}
							fetchRescueProfile={fetchRescueProfile}
							canAddStaff={canAddStaff}
							canEditStaff={canEditStaff}
							canVerifyStaff={canVerifyStaff}
							canDeleteStaff={canDeleteStaff}
							uniquePermissions={uniquePermissions}
							userId={userId}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
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
						className='d-none d-md-block bg-light p-0'
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
							</Nav>
						</Offcanvas.Body>
					</Offcanvas>
					<Col xs={12} md={9} lg={10}>
						{alertInfo.message && (
							<AlertComponent
								type={alertInfo.type}
								message={alertInfo.message}
								onClose={() => setAlertInfo({ type: '', message: '' })}
							/>
						)}
						<div>{renderSection()}</div>
					</Col>
				</Row>
			</Container>
		</>
	);
};

export default RescueProfile;
