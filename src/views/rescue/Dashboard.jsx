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
	Image,
} from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';
import { useAuth } from '../../contexts/AuthContext';
import { useRescueRedirect } from '../../hooks/useRescueRedirect';

import BigNavbar from './BigNavbar';
import SmallNavbar from './SmallNavbar';

import RescueSettings from './Settings';

import AdopterManagement from './AdopterManagement';
import PetManagement from './PetsManagement';
import StaffManagement from './StaffManagement';
import RescueService from '../../services/RescueService';

import RescueNoPermissions from './RescueNoPermissions';
import Conversations from '../user/Conversations';

import './Rescue.scss';

const RescueDashboard = () => {
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
	const [activeSection, setActiveSection] = useState('');

	const { authState } = useAuth();
	const userId = authState.userId;

	const images = [
		{
			src: './undraw/undraw_dashboard_re_3b76.svg',
			component: 'dashboard',
			title: 'Dashboard',
		},
		{
			src: './undraw/undraw_messages_re_qy9x.svg',
			component: 'messages',
			title: 'Messages',
		},
		{
			src: './undraw/undraw_people_re_8spw.svg',
			component: 'staffmanagement',
			title: 'Staff',
		},
		{
			src: './undraw/undraw_pet_adoption_-2-qkw.svg',
			component: 'petmanagement',
			title: 'Pets',
		},
		{
			src: './undraw/undraw_profile_details_re_ch9r.svg',
			component: 'adoptermanagement',
			title: 'Adopters',
		},
		{
			src: './undraw/undraw_personal_file_re_5joy.svg',
			component: 'settings',
			title: 'Settings',
		},
	];

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

	// Check for permissions
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
			case 'settings':
				if (canViewRescueInfo) {
					return (
						<RescueSettings
							rescueProfile={rescueProfile}
							setRescueProfile={setRescueProfile}
							canEditRescueInfo={canEditRescueInfo}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'petmanagement':
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
			case 'staffmanagement':
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
			case 'adoptermanagement':
				if (canViewMessages) {
					return <AdopterManagement rescueId={rescueProfile.rescue_id} />;
				}
			case 'dashboard':
				return <h1>Dashboard</h1>;
			default:
				return null;
			// return <RescueNoPermissions rescueProfile={rescueProfile} />;
		}
	};

	return (
		<Container fluid='md' className='my-4'>
			<Card className='mb-2'>
				<Card.Body className='bg-light text-center border p-3'>
					<span>
						Welcome <h1>{rescueProfile.rescueName}</h1>
					</span>
				</Card.Body>
			</Card>
			{!activeSection ? (
				<BigNavbar navImages={images} activeSection={setActiveSection} />
			) : (
				<SmallNavbar navImages={images} activeSection={setActiveSection} />
			)}
			{/* This will render the selected section */}
			<Card className='mt-2'>
				<Card.Body className='bg-light'>{renderSection()}</Card.Body>
			</Card>
		</Container>
	);
};

export default RescueDashboard;
