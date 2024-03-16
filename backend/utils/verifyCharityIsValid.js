// verifyCharityIsValid.js

const verifyCharityIsValid = (charityData) => {
	// Ensure who_what_where exists and is an array
	const hasValidClassification =
		Array.isArray(charityData.who_what_where) &&
		charityData.who_what_where.some(
			(item) =>
				item.classification_code === '111' &&
				item.classification_type === 'What'
		);

	// Check the base conditions
	return (
		charityData.insolvent === false &&
		charityData.in_administration === false &&
		charityData.reg_status === 'R' &&
		charityData.date_of_removal === null &&
		hasValidClassification
	);
};

export default verifyCharityIsValid;
