import axios from 'axios';

export const postRating = async (petId, ratingType, userId) => {
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
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to post rating');
	}
};
