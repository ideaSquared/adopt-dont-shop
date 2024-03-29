import React, { useState, useEffect } from 'react';
import {
	Badge,
	Button,
	Col,
	Container,
	Form,
	InputGroup,
	Modal,
	Row,
	Table,
	Tabs,
	Tab,
} from 'react-bootstrap';
import axios from 'axios';
import AlertComponent from './AlertComponent';
import { useAuth } from './AuthContext';
import { useRescueRedirect } from './hooks/useRescueRedirect';
import RescueProfileForm from './RescueProfileForm';
import RescueProfileHeader from './RescueProfileHeader';
import RescueStaffManagement from './RescueStaffManagement';
import RescuePetManagement from './RescuePetsManagement';

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

	return (
		<Container fluid>
			<RescueProfileHeader rescueProfile={rescueProfile} />
			{alertInfo.message && (
				<AlertComponent
					type={alertInfo.type}
					message={alertInfo.message}
					onClose={() => setAlertInfo({ type: '', message: '' })}
				/>
			)}
			<RescueProfileForm
				rescueProfile={rescueProfile}
				handleRescueInfoChange={handleRescueInfoChange}
				handleReferenceNumberSubmit={handleReferenceNumberSubmit}
				canEditRescueInfo={canEditRescueInfo}
				saveUpdates={saveUpdates}
			/>

			<hr />

			{canViewPet && <RescuePetManagement rescueId={rescueProfile.id} />}

			{canViewStaff && (
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
			)}
		</Container>
	);
};

export default RescueProfile;
