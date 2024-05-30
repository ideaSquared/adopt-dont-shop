import React, { useState, useEffect } from 'react';
import { StaffService } from '../../services/StaffService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import StaffTable from '../../components/tables/StaffTable';
import PaginationControls from '../../components/common/PaginationControls';
import AddStaffSidebar from '../../components/sidebars/AddStaffSidebar'; // Import the new sidebar component

const StaffManagement = ({
	rescueProfile,
	setRescueProfile,
	canAddStaff,
	canEditStaff,
	canVerifyStaff,
	canDeleteStaff,
	userId,
}) => {
	const [showAddStaffSidebar, setShowAddStaffSidebar] = useState(false);
	const [filterCriteria, setFilterCriteria] = useState({
		nameEmail: '',
		permissions: 'all',
		verified: false,
	});

	useEffect(() => {
		// Placeholder for any potential fetchRescueProfile functionality to reload data.
		// Uncomment and implement if needed.
	}, []);

	// Calculate unique permissions for table headers
	const uniquePermissions = Array.from(
		new Set(rescueProfile.staff.flatMap((staff) => staff.permissions))
	);

	// Handle changes to filter criteria
	const handleFilterChange = (field) => (event) => {
		const value =
			field === 'verified' ? event.target.checked : event.target.value;
		setFilterCriteria({ ...filterCriteria, [field]: value });
	};

	// Apply filters to the staff list
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

	// Verify staff member
	const verifyStaff = async (staffId) => {
		if (canVerifyStaff) {
			try {
				const response = await StaffService.verifyStaffMember(
					rescueProfile.rescue_id,
					staffId
				);
				setRescueProfile((prevState) => ({
					...prevState,
					staff: prevState.staff.map((staff) =>
						staff.userId === staffId
							? { ...staff, verifiedByRescue: true }
							: staff
					),
				}));
			} catch (error) {
				console.error('Failed to verify staff member', error);
			}
		}
	};

	// Remove staff member
	const removeStaff = async (staffId) => {
		if (canDeleteStaff) {
			if (
				!window.confirm('Are you sure you want to remove this staff member?')
			) {
				return;
			}
			try {
				await StaffService.removeStaffMember(rescueProfile.rescue_id, staffId);
				setRescueProfile((prevState) => ({
					...prevState,
					staff: prevState.staff.filter((staff) => staff.userId !== staffId),
				}));
			} catch (error) {
				console.error('Failed to remove staff member', error);
			}
		}
	};

	const updatePermissions = async (staffId, permission, isChecked) => {
		if (!canEditStaff) return;

		// First, determine the current permissions of the staff member
		const currentStaffMember = rescueProfile.staff.find(
			(staff) => staff.userId === staffId
		);
		if (!currentStaffMember) {
			console.error('Staff member not found');
			return;
		}

		// Ensure permissions is an array, even if it's initially null
		const permissionsArray = currentStaffMember.permissions || [];

		// Then, update the permissions array based on the action
		const updatedPermissions = isChecked
			? [...permissionsArray, permission] // Add the permission if checked
			: permissionsArray.filter((p) => p !== permission); // Remove the permission if unchecked

		try {
			// Assuming `updateStaffPermissions` is the function that makes the API call
			const response = await StaffService.updateStaffPermissions(
				rescueProfile.rescue_id,
				staffId,
				updatedPermissions
			);

			// Update state with the backend response
			setRescueProfile((prevState) => {
				const updatedStaff = prevState.staff.map((staff) => {
					if (staff.userId === staffId) {
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

			<GenericFilterForm
				filters={[
					{
						type: 'text',
						// label: 'Name or Email',
						placeholder: 'Search by name or email',
						value: filterCriteria.nameEmail, // Corrected reference
						onChange: handleFilterChange('nameEmail'),
						md: 3,
					},
					{
						type: 'select',
						// label: 'Permissions:',
						value: filterCriteria.permissions, // Corrected reference
						onChange: handleFilterChange('permissions'),
						options: [
							{ value: 'all', label: 'Filter by all permissions' },
							...uniquePermissions.map((perm) => ({
								value: perm,
								label: perm,
							})),
						],
						md: 3,
					},
					{
						type: 'switch',
						id: 'verified-switch',
						label: 'Verified Only',
						checked: filterCriteria.verified, // Corrected reference
						onChange: handleFilterChange('verified'),
						md: 3,
					},
					canAddStaff && {
						type: 'button',
						label: 'Add Staff',
						onClick: () => setShowAddStaffSidebar(true),
						variant: 'primary',
						md: 3,
					},
				].filter(Boolean)}
			/>

			<AddStaffSidebar
				show={showAddStaffSidebar}
				handleClose={() => setShowAddStaffSidebar(false)}
				setRescueProfile={setRescueProfile}
				rescueId={rescueProfile.rescue_id}
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
