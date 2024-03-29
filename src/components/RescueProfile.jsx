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
	const [showAddStaffModal, setShowAddStaffModal] = useState(false);
	const [newStaff, setNewStaff] = useState({
		firstName: '',
		email: '',
		password: '',
	});

	const [currentPage, setCurrentPage] = useState(1);
	const [staffPerPage] = useState(10);

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
			// Implement user feedback
		}
	};

	// Calculate unique permissions for table headers
	const uniquePermissions = Array.from(
		new Set(rescueProfile.staff.flatMap((staff) => staff.permissions))
	);

	const handlePermissionChange = async (staffId, permission, isChecked) => {
		// Update local state first for immediate feedback
		setRescueProfile((prevState) => {
			const updatedStaff = prevState.staff.map((staff) => {
				if (staff.userId === staffId) {
					const updatedPermissions = isChecked
						? [...staff.permissions, permission]
						: staff.permissions.filter((p) => p !== permission);

					return {
						...staff,
						permissions: updatedPermissions,
					};
				}
				return staff;
			});

			return {
				...prevState,
				staff: updatedStaff,
			};
		});

		// Prepare the data for updating the backend
		const updatedPermissions = rescueProfile.staff.find(
			(s) => s.userId._id === staffId
		).permissions;
		if (isChecked && !updatedPermissions.includes(permission)) {
			updatedPermissions.push(permission);
		} else if (!isChecked) {
			const index = updatedPermissions.indexOf(permission);
			if (index > -1) {
				updatedPermissions.splice(index, 1); // Remove permission if unchecked
			}
		}

		// Send an update request to the backend
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${
					rescueProfile.id
				}/staff/${staffId}/permissions`,
				{
					permissions: updatedPermissions,
				},
				{
					withCredentials: true,
				}
			);
			// console.log('Permissions updated successfully:', response.data);
			// Optionally, you could fetch the updated rescue profile here to ensure the UI is fully in sync with the backend
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error updating staff permissions:',
				error.response?.data || error.message
			);
		}
	};

	const handleRescueInfoChange = (e) => {
		const { name, value } = e.target;
		setRescueProfile((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const verifyStaffMember = async (rescueId, staffId) => {
		try {
			const response = await axios.put(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/rescue/${rescueId}/staff/${staffId}/verify`,
				{}, // PUT request does not need a body for this operation
				{ withCredentials: true }
			);

			// Reload or update the rescue profile to reflect the changes
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error verifying staff member:',
				error.response?.data || error.message
			);
		}
	};

	const removeStaffMember = async (rescueId, staffId) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this staff member?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}

		try {
			const response = await axios.delete(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/rescue/${rescueId}/staff/${staffId}`,
				{ withCredentials: true }
			);
			// Reload or update the rescue profile to reflect the changes
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error removing staff member:',
				error.response?.data || error.message
			);
		}
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

	const handleAddStaff = async () => {
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${rescueProfile.id}/staff`,
				{
					firstName: newStaff.firstName,
					email: newStaff.email,
					password: newStaff.password,
				},
				{
					withCredentials: true,
				}
			);
			// console.log('Staff added successfully:', response.data);
			setShowAddStaffModal(false); // Close the modal on success
			fetchRescueProfile(); // Refresh the staff list
		} catch (error) {
			console.error(
				'Error adding new staff member:',
				error.response?.data || error.message
			);
		}
	};

	// Updated handleRemoveStaff to use the new API call
	const handleRemoveStaff = (staffId) => {
		removeStaffMember(rescueProfile.id, staffId);
	};

	// Assuming each staff member's verification status can be toggled with a button in your UI
	const handleVerifyStaff = (staffId) => {
		verifyStaffMember(rescueProfile.id, staffId);
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

	const indexOfLastStaff = currentPage * staffPerPage;
	const indexOfFirstStaff = indexOfLastStaff - staffPerPage;
	const currentPets = rescueProfile.staff.slice(
		indexOfFirstStaff,
		indexOfLastStaff
	);
	const totalPages = Math.ceil(rescueProfile.staff.length / staffPerPage);

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

			{canViewStaff && (
				<>
					<RescueStaffManagement
						rescueProfile={rescueProfile}
						currentPage={currentPage}
						totalPages={totalPages}
						canAddStaff={canAddStaff}
						canEditStaff={canEditStaff}
						canVerifyStaff={canVerifyStaff}
						canDeleteStaff={canDeleteStaff}
						showAddStaffModal={showAddStaffModal}
						setShowAddStaffModal={setShowAddStaffModal}
						uniquePermissions={uniquePermissions}
						setCurrentPage={setCurrentPage}
						newStaff={newStaff}
						setNewStaff={setNewStaff}
						handleAddStaff={handleAddStaff}
						handleRemoveStaff={handleRemoveStaff}
						handleVerifyStaff={handleVerifyStaff}
						handlePermissionChange={handlePermissionChange}
						userId={userId}
					/>
				</>
			)}
		</Container>
	);
};

export default RescueProfile;
