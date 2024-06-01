import React from 'react';
import { useFilteredStaff } from '../../hooks/useFilteredStaff';
import StaffTable from '../../components/tables/StaffTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import { Rescue } from '../../types/rescue';
import { StaffService } from '../../services/StaffService';

interface StaffProps {
	rescueProfile: Rescue | null;
}

const Staff: React.FC<StaffProps> = ({ rescueProfile }) => {
	if (!rescueProfile) {
		return <p>Rescue profile not available.</p>;
	}

	const {
		filteredStaff,
		isLoading,
		error,
		filterCriteria,
		handleFilterChange,
		refreshStaff,
	} = useFilteredStaff(rescueProfile.rescue_id);

	const handleVerifyStaff = async (userId: string) => {
		try {
			await StaffService.verifyStaffMember(rescueProfile.rescue_id, userId);
			console.log('Verified staff member:', userId);
			refreshStaff();
		} catch (err) {
			console.error('Failed to verify staff member', err);
		}
	};

	const handleRemoveStaff = async (userId: string) => {
		try {
			await StaffService.removeStaffMember(rescueProfile.rescue_id, userId);
			console.log('Removed staff member:', userId);
			refreshStaff();
		} catch (err) {
			console.error('Failed to remove staff member', err);
		}
	};

	const handleUpdatePermissions = async (
		userId: string,
		permission: string,
		value: boolean
	) => {
		try {
			const staffMember = filteredStaff.find(
				(staff) => staff.user_id === userId
			);
			if (!staffMember) return;

			const updatedPermissions = value
				? [...(staffMember.permissions || []), permission]
				: (staffMember.permissions || []).filter((p) => p !== permission);

			await StaffService.updateStaffPermissions(
				rescueProfile.rescue_id,
				userId,
				updatedPermissions
			);
			console.log('Updated permissions for:', userId);
			refreshStaff();
		} catch (err) {
			console.error('Failed to update permissions', err);
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
			<h2 className='text-xl mb-4'>Staff</h2>
			{isLoading ? (
				<p>Loading...</p>
			) : error ? (
				<p>Error: {error.message}</p>
			) : (
				<>
					<GenericFilterForm
						filters={[
							{
								type: 'text',
								placeholder: 'Search by name or email',
								value: filterCriteria.nameEmail,
								onChange: handleFilterChange('nameEmail'),
							},
							{
								type: 'select',
								value: filterCriteria.permissions,
								onChange: handleFilterChange('permissions'),
								options: [
									{ value: 'all', label: 'Filter by all permissions' },
									...Array.from(
										new Set(
											filteredStaff.flatMap(
												(staffMember) => staffMember.permissions || []
											)
										)
									).map((perm) => ({
										value: perm || '',
										label: perm || '',
									})),
								],
							},
							{
								type: 'switch',
								id: 'verified-switch',
								name: 'verified',
								label: 'Verified Only',
								checked: filterCriteria.verified,
								onChange: handleFilterChange('verified'),
							},
						]}
					/>
					<StaffTable
						staff={filteredStaff}
						verifyStaff={handleVerifyStaff}
						removeStaff={handleRemoveStaff}
						updatePermissions={handleUpdatePermissions}
						canEdit={true}
						permissionCategories={permissionCategories}
						permissionNames={permissionNames}
						user_id={rescueProfile.rescue_id}
					/>
				</>
			)}
		</div>
	);
};

export default Staff;
