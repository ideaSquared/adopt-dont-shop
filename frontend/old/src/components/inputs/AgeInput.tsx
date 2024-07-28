import React from 'react';

interface AgeInputProps {
	ageInMonths: number | string;
	setAgeInMonths: (ageInMonths: number) => void;
}

// Utility function to parse the backend age format
const parseAgeFormat = (ageString: string): number => {
	const ageParts = ageString.split(' ');
	let totalMonths = 0;

	for (let i = 0; i < ageParts.length; i += 2) {
		const value = parseInt(ageParts[i], 10);
		const unit = ageParts[i + 1];

		if (unit.includes('year')) {
			totalMonths += value * 12;
		} else if (unit.includes('month')) {
			totalMonths += value;
		}
	}

	return totalMonths;
};

const AgeInput: React.FC<AgeInputProps> = ({ ageInMonths, setAgeInMonths }) => {
	if (typeof ageInMonths === 'string') {
		ageInMonths = parseAgeFormat(ageInMonths);
	}

	const years = Math.floor(ageInMonths / 12);
	const months = ageInMonths % 12;

	const handleYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const yearsValue = Number(e.target.value);
		if (yearsValue >= 0) {
			setAgeInMonths(yearsValue * 12 + months);
		}
	};

	const handleMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const monthsValue = Number(e.target.value);
		if (monthsValue >= 0 && monthsValue < 12) {
			setAgeInMonths(years * 12 + monthsValue);
		}
	};

	return (
		<div className='age-input'>
			<label
				htmlFor='years'
				className='block text-sm font-medium text-gray-700'
			>
				Age
			</label>
			<div className='flex space-x-2'>
				<div className='flex-1'>
					<label
						htmlFor='years'
						className='block text-sm font-medium text-gray-700'
					>
						Years
					</label>
					<input
						type='number'
						id='years'
						placeholder='Years'
						value={years}
						onChange={handleYearsChange}
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					/>
				</div>
				<div className='flex-1'>
					<label
						htmlFor='months'
						className='block text-sm font-medium text-gray-700'
					>
						Months
					</label>
					<input
						type='number'
						id='months'
						placeholder='Months'
						value={months}
						onChange={handleMonthsChange}
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					/>
				</div>
			</div>
		</div>
	);
};

export { parseAgeFormat };
export default AgeInput;
