/**
 * Validates company data by checking its operational status and the absence of a cessation date.
 *
 * This function scrutinizes the given company data object to determine if the company is considered
 * valid based on its status and operational condition. The validation focuses on ensuring that the
 * company is currently active, as indicated by its status fields, and has not been marked as ceased
 * according to its date of cessation. This is critical for applications that require interaction with
 * only operational and legally recognized companies, such as those involved in financial transactions,
 * compliance checks, or business analytics.
 *
 * @param {Object} companyData - An object containing information about a company. Expected to include
 * fields such as 'status', 'company_status', and 'date_of_cessation', which provide insights into
 * the company's current operational status.
 *
 * @returns {boolean} - Returns true if the company is marked as 'active' both in the 'status' and
 * 'company_status' fields, and if it does not have a 'date_of_cessation' value, indicating it has
 * not officially ceased operations. Otherwise, returns false.
 *
 * The function's logic is designed to accommodate variations in status labeling, acknowledging that
 * 'active' and 'open' are both valid indicators of a company being in operation. This adaptability
 * ensures broader applicability across different datasets or APIs that may use slightly different
 * terminology for company statuses.
 *
 * Example usage:
 * ```
 * const companyInfo = {
 *   status: 'active',
 *   company_status: 'open',
 *   date_of_cessation: null
 * };
 *
 * const isValid = verifyCompanyIsValid(companyInfo);
 * console.log(isValid); // Outputs: true, as the company meets all validity criteria
 * ```
 *
 * Employing this utility function helps in filtering out defunct, closed, or otherwise inoperative
 * companies from datasets or API responses, ensuring that downstream processes or analyses are
 * conducted on relevant and currently active entities.
 */
const verifyCompanyIsValid = (companyData) => {
	// Check the company's status, company_status, and date_of_cessation
	return (
		companyData.status === 'active' &&
		(companyData.company_status === 'active' ||
			companyData.company_status === 'open') &&
		!companyData.date_of_cessation
	);
};

export default verifyCompanyIsValid;
