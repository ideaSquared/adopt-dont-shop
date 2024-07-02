// petAgeConverter.js

/**
 * Converts pet age from months to a more readable format.
 * @param {number} months - The age of the pet in months.
 * @returns {string} - The readable format of the pet's age.
 */
export function convertPetAge(months) {
	if (months < 0) {
		throw new Error('Age in months cannot be negative');
	}

	if (months === 0) {
		return '0 months';
	}

	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	let readableFormat = '';

	if (years > 0) {
		readableFormat += years === 1 ? '1 year' : `${years} years`;
	}

	if (remainingMonths > 0) {
		if (years > 0) {
			readableFormat += ' ';
		}
		readableFormat +=
			remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
	}

	return readableFormat;
}
