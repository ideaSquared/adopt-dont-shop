import React, { useState, useEffect } from 'react';
import {
	FormInput,
	TextInput,
	SelectInput,
	CheckboxInput,
	Table,
	Button,
	Badge,
} from '@adoptdontshop/components';
import styled from 'styled-components';
import { Rescue, StaffMember } from '@adoptdontshop/libs/rescues';
import { RescueService } from '@adoptdontshop/libs/rescues';
import { Role } from 'contexts/Permission';

const BadgeWrapper = styled.div`
	display: flex;
	gap: 0.5rem; /* space between badges */
`;

const Staff: React.FC = () => {
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
	const [searchByEmailName, setSearchByEmailName] = useState<string | null>('');
	const [filterByRole, setFilterByRole] = useState<Role | 'all'>('all');
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

			const matchesRole =
				filterByRole === 'all' || member.role.includes(filterByRole as Role);

			const matchesVerified = !filterByVerified || member.verified_by_rescue;

			return matchesSearch && matchesRole && matchesVerified;
		});

		setFilteredStaff(filtered);
	}, [searchByEmailName, filterByRole, filterByVerified, staff]);

	const handleSearchByEmailName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchByEmailName(e.target.value);
	};

	const handleFilterByRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFilterByRole(e.target.value as Role | 'all');
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
			<FormInput label='Filter by Role'>
				<SelectInput
					value={filterByRole}
					onChange={handleFilterByRole}
					options={[
						{ value: 'all', label: 'Filter by all roles' },
						...Object.values(Role).map((role) => ({
							value: role,
							label: role.replace(/_/g, ' ').toLowerCase(),
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
						<th>Role</th>
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
							<td>
								<BadgeWrapper>
									{staff.role.map((role) => (
										<Badge key={role} variant='info'>
											{role.replace(/_/g, ' ').toUpperCase()}
										</Badge>
									))}
								</BadgeWrapper>
							</td>

							<td>
								{staff.verified_by_rescue ? (
									<Badge variant='success'>YES</Badge>
								) : (
									<Badge variant='danger'>NO</Badge>
								)}
							</td>
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
