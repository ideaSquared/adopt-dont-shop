import { Rescue, StaffMember } from './Rescue';

const rescues: Rescue[] = [
	{
		rescue_id: '1',
		rescue_name: 'Animal Rescue A',
		rescue_type: 'Non-Profit',
		rescue_city: 'New York',
		rescue_country: 'USA',
		reference_number: 'AR1234',
		reference_number_verified: true,
		country: 'USA',
		staff: [
			{
				user_id: '1',
				first_name: 'John',
				last_name: 'Doe',
				email: 'john@example.com',
				permissions: ['read', 'write'],
				verified_by_rescue: true,
			},
			{
				user_id: '2',
				first_name: 'Jane',
				last_name: 'Doe',
				email: 'jane@example.com',
				permissions: ['read'],
				verified_by_rescue: false,
			},
		],
	},
	{
		rescue_id: '2',
		rescue_name: 'Wildlife Rescue B',
		rescue_type: 'Government',
		rescue_city: 'Los Angeles',
		rescue_country: 'USA',
		country: 'USA',
		staff: [
			{
				user_id: '3',
				first_name: 'Alice',
				last_name: 'Smith',
				email: 'alice@example.com',
				permissions: ['read', 'write'],
				verified_by_rescue: true,
			},
			{
				user_id: '4',
				first_name: 'Bob',
				last_name: 'Johnson',
				email: 'bob@example.com',
				permissions: ['read'],
				verified_by_rescue: true,
			},
		],
	},
];

const getRescues = (): Rescue[] => rescues;

const getRescueById = (id: string): Rescue | undefined =>
	rescues.find((rescue) => rescue.rescue_id === id);

const getStaffMembersByRescueId = (
	rescue_id: string
): StaffMember[] | undefined => {
	const rescue = getRescueById(rescue_id);
	return rescue?.staff;
};

const getStaffMemberById = (
	rescue_id: string,
	staff_id: string
): StaffMember | undefined => {
	const staff = getStaffMembersByRescueId(rescue_id);
	return staff?.find((member) => member.user_id === staff_id);
};

export default {
	getRescues,
	getRescueById,
	getStaffMembersByRescueId,
	getStaffMemberById,
};
