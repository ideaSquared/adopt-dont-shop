import axios from 'axios';

export const postRating = async (petId: string, ratingType: string, userId: string): Promise<any> => {
	const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/ratings`;
	try {
		const response = await axios.post(
			apiUrl,
			{
				userId,
				targetType: 'Pet',
				petId,
				ratingType,
			},
			{
				withCredentials: true,
			}
		);
		return response.data;
	} catch (error: any) {
		throw new Error(error.response?.data?.message || 'Failed to post rating');
	}
};
