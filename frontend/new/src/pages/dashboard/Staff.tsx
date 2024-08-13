import React, { useState, useEffect } from 'react';
import {
	FormInput,
	TextInput,
	SelectInput,
	CheckboxInput,
	Table,
	Button,
} from '@adoptdontshop/components';
import { Rescue, StaffMember } from '@adoptdontshop/libs/rescues';
import { RescueService } from '@adoptdontshop/libs/rescues';

const Staff: React.FC = () => {
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
	const [searchByEmailName, setSearchByEmailName] = useState<string | null>('');
	const [filterByPermissions, setFilterByPermissions] = useState<string | null>(
		''
	);
	const [filterByVerified, setFilterByVerified] = useState<boolean>(false);

	useEffect(() => {
		const fetchedStaff = RescueService.getStaffMembersByRescueId('1') || [];
		setStaff(fetchedStaff);
		setFilteredStaff(fetchedStaff);
	}, []);

	useEffect(() => {
		const filtered = staff.filter((member) => {
			const matchesSearch =
				!searchByEmailName ||
				member.email.toLowerCase().includes(searchByEmailName.toLowerCase()) ||
				member.first_name
					.toLowerCase()
					.includes(searchByEmailName.toLowerCase()) ||
				(member.last_name
					?.toLowerCase()
					.includes(searchByEmailName.toLowerCase()) ??
					false);

			const matchesPermissions =
				!filterByPermissions ||
				filterByPermissions === 'all' ||
				member.permissions?.includes(filterByPermissions);

			const matchesVerified = !filterByVerified || member.verified_by_rescue;

			return matchesSearch && matchesPermissions && matchesVerified;
		});

		setFilteredStaff(filtered);
	}, [searchByEmailName, filterByPermissions, filterByVerified, staff]);

	const handleSearchByEmailName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchByEmailName(e.target.value);
	};

	const handleFilterByPermissions = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		setFilterByPermissions(e.target.value);
	};

	const handleFilterByVerified = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilterByVerified(e.target.checked);
	};

	return (
		<div>
			<h1>Staff</h1>
			<FormInput label='Search by name or email'>
				<TextInput
					type='text'
					value={searchByEmailName}
					onChange={handleSearchByEmailName}
				/>
			</FormInput>
			<FormInput label='Filter by permissions'>
				<SelectInput
					value={filterByPermissions}
					onChange={handleFilterByPermissions}
					options={[
						{ value: 'all', label: 'Filter by all permissions' },
						...Array.from(
							new Set(filteredStaff.flatMap((staff) => staff.permissions || []))
						).map((perm) => ({
							value: perm,
							label: perm,
						})),
					]}
				/>
			</FormInput>
			<FormInput label='Verified Only'>
				<CheckboxInput
					checked={filterByVerified}
					onChange={handleFilterByVerified}
				/>
			</FormInput>
			<Table>
				<thead>
					<tr>
						<th>Staff ID</th>
						<th>First Name</th>
						<th>Last Name</th>
						<th>Email</th>
						<th>Permissions</th>
						<th>Verified</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{filteredStaff.map((staff) => (
						<tr key={staff.user_id}>
							<td>{staff.user_id}</td>
							<td>{staff.first_name}</td>
							<td>{staff.last_name}</td>
							<td>{staff.email}</td>
							<td>{staff.permissions?.join(', ') || 'None'}</td>
							<td>{staff.verified_by_rescue ? 'Yes' : 'No'}</td>
							<td>
								<Button type='button'>Delete</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Staff;
