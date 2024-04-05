// StaffManagement.js TODO: FIX
import React, { useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import { StaffService } from '../../services/StaffService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import StaffTable from '../../components/tables/StaffTable';
import PaginationControls from '../../components/common/PaginationControls';
import AlertComponent from '../../components/common/AlertComponent';
import AddStaffModal from '../../components/modals/AddStaffModal';

const StaffManagement = ({
	rescueProfile,
	setRescueProfile,
	// fetchRescueProfile,
	canAddStaff,
	canEditStaff,
	canVerifyStaff,
	canDeleteStaff,
	userId,
}) => {
	const [showAddStaffModal, setShowAddStaffModal] = useState(false);
	const [filterCriteria, setFilterCriteria] = useState({
		nameEmail: '',
		permissions: 'all',
		verified: false,
	});
	const [permissionsUpdateFlag, setPermissionsUpdateFlag] = useState(false);

	// Calculate unique permissions for table headers
	const uniquePermissions = Array.from(
		new Set(rescueProfile.staff.flatMap((staff) => staff.permissions))
	);

	// Update the filter state based on field name and value
	const handleFilterChange = (field) => (event) => {
		const value =
			field === 'verified' ? event.target.checked : event.target.value;
		setFilterCriteria({ ...filterCriteria, [field]: value });
	};

	// Apply all filters to the staff list
	const filteredStaff = rescueProfile.staff.filter((staff) => {
		const nameEmailMatch = `${staff.firstName} ${staff.email}`
			.toLowerCase()
			.includes(filterCriteria.nameEmail.toLowerCase());
		const permissionMatch =
			filterCriteria.permissions === 'all' ||
			staff.permissions.includes(filterCriteria.permissions);
		const verifiedMatch = !filterCriteria.verified || staff.verifiedByRescue;

		return nameEmailMatch && permissionMatch && verifiedMatch;
	});

	const [currentPage, setCurrentPage] = useState(1);
	const staffPerPage = 10;
	const totalPages = Math.ceil(filteredStaff.length / staffPerPage);

	const [showAddModal, setShowAddModal] = useState(false);

	const handleModalClose = () => setShowAddModal(false);
	const handleModalShow = () => setShowAddModal(true);

	const verifyStaff = async (staffId) => {
		await StaffService.verifyStaffMember(rescueProfile.id, staffId);
		// fetchRescueProfile();
	};

	const removeStaff = async (staffId) => {
		await StaffService.removeStaffMember(rescueProfile.id, staffId);
		// fetchRescueProfile();
	};

	const updatePermissions = async (staffId, permission, isChecked) => {
		// First, determine the current permissions of the staff member
		const currentStaffMember = rescueProfile.staff.find(
			(staff) => staff.userId._id === staffId
		);
		if (!currentStaffMember) {
			console.error('Staff member not found');
			return;
		}

		// Then, update the permissions array based on the action
		const updatedPermissions = isChecked
			? [...currentStaffMember.permissions, permission] // Add the permission if checked
			: currentStaffMember.permissions.filter((p) => p !== permission); // Remove the permission if unchecked

		try {
			// Assuming `updateStaffPermissions` is the function that makes the API call
			const response = await StaffService.updateStaffPermissions(
				rescueProfile.id,
				staffId,
				updatedPermissions
			);

			// Update state with the backend response
			setRescueProfile((prevState) => {
				const updatedStaff = prevState.staff.map((staff) => {
					if (staff.userId._id === staffId) {
						// Update only the permissions part of the staff member
						// Ensure response.data contains the updated permissions array
						return { ...staff, permissions: response.data.permissions };
					}
					return staff;
				});

				return { ...prevState, staff: updatedStaff };
			});
		} catch (error) {
			console.error('Failed to update permissions', error);
			// Optionally handle errors, e.g., by reverting the optimistic update or showing a notification
		}
	};

	const permissionCategories = {
		rescueOperations: ['view_rescue_info', 'edit_rescue_info', 'delete_rescue'],
		staffManagement: [
			'view_staff',
			'add_staff',
			'edit_staff',
			'verify_staff',
			'delete_staff',
		],
		petManagement: ['view_pet', 'add_pet', 'edit_pet', 'delete_pet'],
		communications: ['create_messages', 'view_messages'],
	};

	const permissionNames = {
		view_rescue_info: 'View Rescue Information',
		edit_rescue_info: 'Edit Rescue Information',
		delete_rescue: 'Delete Rescue',
		view_staff: 'View Staff',
		add_staff: 'Add Staff',
		edit_staff: 'Edit Staff Information',
		verify_staff: 'Verify Staff',
		delete_staff: 'Delete Staff',
		view_pet: 'View Pet',
		add_pet: 'Add Pet',
		edit_pet: 'Edit Pet Information',
		delete_pet: 'Delete Pet',
		create_messages: 'Create Messages',
		view_messages: 'View Messages',
	};

	return (
		<div>
			<h2>Staff Members</h2>
			<Container>
				<GenericFilterForm
					filters={[
						{
							type: 'text',
							label: 'Name or Email',
							placeholder: 'Search by name or email',
							value: filterCriteria.nameEmail, // Corrected reference
							onChange: handleFilterChange('nameEmail'),
							md: 4,
						},
						{
							type: 'select',
							label: 'Permissions',
							value: filterCriteria.permissions, // Corrected reference
							onChange: handleFilterChange('permissions'),
							options: [
								{ value: 'all', label: 'All' },
								...uniquePermissions.map((perm) => ({
									value: perm,
									label: perm,
								})),
							],
							md: 4,
						},
						{
							type: 'switch',
							id: 'verified-switch',
							label: 'Verified Only',
							checked: filterCriteria.verified, // Corrected reference
							onChange: handleFilterChange('verified'),
						},
					]}
				/>

				<Button variant='primary' onClick={() => setShowAddStaffModal(true)}>
					Add Staff
				</Button>
			</Container>
			<AddStaffModal
				show={showAddStaffModal}
				handleClose={() => setShowAddStaffModal(false)}
				// fetchRescueProfile={fetchRescueProfile}
				rescueId={rescueProfile.id}
				canAddStaff={canAddStaff}
			/>
			<StaffTable
				staff={filteredStaff}
				verifyStaff={verifyStaff}
				removeStaff={removeStaff}
				updatePermissions={updatePermissions}
				canEdit={canEditStaff}
				permissionCategories={permissionCategories}
				permissionNames={permissionNames}
				userId={userId}
			/>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default StaffManagement;
