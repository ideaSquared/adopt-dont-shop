export interface Application {
	id: string;
	first_name: string;
	pet_id: string;
	pet_name: string;
	description: string;
	status: string;
	actioned_by: string | null;
}

export const fetchApplications = async (): Promise<Application[]> => {
	// const response = await fetch(
	// 	`${import.meta.env.VITE_API_BASE_URL}/applications`
	// );
	// if (!response.ok) {
	// 	throw new Error('Failed to fetch applications');
	// }
	// const data = await response.json();
	// return data;
	// Mock data
	const data: Application[] = [
		{
			id: '1',
			first_name: 'John',
			pet_id: 'pet_0000d23c93486091',
			pet_name: 'Buddy',
			description: 'Looking for a friendly companion for my kids.',
			status: 'pending',
			actioned_by: null,
		},
		{
			id: '2',
			first_name: 'Jane',
			pet_id: 'pet_0000b8f0ffc29b18',
			pet_name: 'Max',
			description: 'Need a playful pet for my apartment.',
			status: 'approved',
			actioned_by: null,
		},
		{
			id: '3',
			first_name: 'Alice',
			pet_id: 'pet_0000d23c93486091',
			pet_name: 'Bella',
			description: 'Want a calm pet to accompany my elderly mother.',
			status: 'rejected',
			actioned_by: 'admin3',
		},
	];

	// Simulate a delay to mimic fetching data
	return new Promise((resolve) => {
		resolve(data);
	});
};
