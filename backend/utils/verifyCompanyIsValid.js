// verifyCompanyIsValid.js

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
