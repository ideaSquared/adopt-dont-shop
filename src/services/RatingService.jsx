import axios from 'axios';

export const postRating = async (
	targetId,
	ratingType,
	ratingSource,
	onModel,
	userId
) => {
	try {
		const response = await axios.post(
			`${import.meta.env.VITE_API_BASE_URL}/ratings`,
			{
				userId: userId,
				targetType: 'Pet', // Assuming the target type is always 'Pet'
				targetId: targetId,
				ratingType: ratingType, // 'like', 'dislike', or 'love'
				ratingSource: ratingSource,
				onModel: onModel,
			},
			{
				withCredentials: true,
			}
		);
		// Return the response data or a success message if needed
		return response.data;
	} catch (error) {
		// Optionally, handle errors or re-throw them to be handled by the caller
		throw new Error(error.message || 'Failed to post rating');
	}
};
