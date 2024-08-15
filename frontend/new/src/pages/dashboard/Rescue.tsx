import React, { useState } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	CheckboxInput,
	Table,
	CountrySelectInput,
	Button,
} from '@adoptdontshop/components';

const Rescue: React.FC = () => {
	const [rescueName, setRescueName] = useState('');
	const [rescueType, setRescueType] = useState('');
	const [referenceNumber, setReferenceNumber] = useState('');
	const [country, setCountry] = useState('United Kingdom');

	const handleRescueNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRescueName(e.target.value);
	};

	const handleRescueTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setRescueType(e.target.value);
	};

	const handleReferenceNumberChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setReferenceNumber(e.target.value);
	};

	const handleCountryChange = (selectedCountry: string) => {
		setCountry(selectedCountry);
	};

	const handleSubmit = () => {
		// Handle the submit action for verification
		console.log('Submitted for verification:', { rescueName, referenceNumber });
	};

	return (
		<div>
			<h1>Rescue</h1>
			<FormInput label='Rescue name'>
				<TextInput
					type='text'
					value={rescueName}
					onChange={handleRescueNameChange}
					placeholder='Enter rescue name'
				/>
			</FormInput>
			<FormInput label='Rescue type'>
				<SelectInput
					value={rescueType}
					onChange={handleRescueTypeChange}
					options={[
						{ value: 'individual', label: 'Individual' },
						{ value: 'charity', label: 'Charity' },
						{ value: 'company', label: 'Company' },
					]}
				/>
			</FormInput>
			<FormInput label='Reference number'>
				<TextInput
					type='text'
					value={referenceNumber}
					onChange={handleReferenceNumberChange}
					placeholder='Enter reference number'
				/>
				<Button type='button' onClick={handleSubmit}>
					Submit for verification
				</Button>
			</FormInput>
			<FormInput label='Country'>
				<CountrySelectInput
					onCountryChange={handleCountryChange}
					countryValue={country}
				/>
			</FormInput>
		</div>
	);
};

export default Rescue;
