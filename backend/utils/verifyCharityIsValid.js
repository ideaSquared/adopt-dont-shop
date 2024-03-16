/**
 * Evaluates the validity of charity data based on a set of predefined conditions.
 *
 * This function is designed to validate charity information, ensuring that the charity meets certain criteria
 * indicative of its operational and regulatory status. It checks various fields within the charityData object,
 * such as the charity's insolvency status, administration status, registration status, removal date, and
 * classifications regarding its activities.
 *
 * @param {Object} charityData - An object containing data about a charity. This data includes fields such as
 * 'insolvent', 'in_administration', 'reg_status', 'date_of_removal', and 'who_what_where', which represents
 * classifications related to the charity's activities and operational focus.
 *
 * @returns {boolean} - Returns true if the charity data meets all the following conditions: not insolvent,
 * not in administration, registered (indicated by 'reg_status' being 'R'), not removed (indicated by
 * 'date_of_removal' being null), and has a valid classification (specifically, at least one entry in
 * 'who_what_where' with a 'classification_code' of '111' and a 'classification_type' of 'What').
 * Otherwise, it returns false.
 *
 * The validation logic implemented in this function ensures that only charities that are active, properly
 * registered, and not undergoing financial distress or dissolution are considered valid. The specific
 * classification check (code '111' and type 'What') is an example of a more detailed criterion that could
 * be adjusted based on the requirements of the application or the data source's schema.
 *
 * Example usage:
 * ```
 * const charityInfo = {
 *   insolvent: false,
 *   in_administration: false,
 *   reg_status: 'R',
 *   date_of_removal: null,
 *   who_what_where: [{ classification_code: '111', classification_type: 'What' }],
 * };
 *
 * const isValid = verifyCharityIsValid(charityInfo);
 * console.log(isValid); // Outputs: true or false based on the charity data
 * ```
 *
 * This utility function is crucial for applications that need to filter, display, or work with charity
 * data, ensuring that only charities meeting certain operational and regulatory standards are considered.
 */
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
