import React, { useState, useEffect } from 'react';
import PreferencesService from '../../services/PreferencesService';
import AllowedPreferences from '../../components/AllowedPreferences';

const allowedPreferences = AllowedPreferences();

const isValidPreference = (category, key) => {
	return (
		allowedPreferences.hasOwnProperty(category) &&
		(allowedPreferences[category].includes(key) || key === 'any')
	);
};

const PreferencesManager = () => {
	const [preferences, setPreferences] = useState([]);
	const [preferenceValues, setPreferenceValues] = useState({});

	useEffect(() => {
		fetchPreferences();
	}, []);

	const fetchPreferences = async () => {
		try {
			const data = await PreferencesService.fetchUserPreferences();
			const initialPreferenceValues = data.reduce((acc, preference) => {
				acc[preference.preference_key] = preference.preference_value;
				return acc;
			}, {});
			for (const category of Object.keys(allowedPreferences)) {
				if (!initialPreferenceValues[category]) {
					initialPreferenceValues[category] = 'any';
				}
			}
			setPreferences(data);
			setPreferenceValues(initialPreferenceValues);
		} catch (error) {
			console.error('Failed to fetch preferences:', error);
		}
	};

	const handleAddOrUpdatePreference = async (
		preferenceKey,
		preferenceValue
	) => {
		try {
			if (!isValidPreference(preferenceKey, preferenceValue)) {
				alert('Invalid preference key or value');
				return;
			}

			const existingPreference = preferences.find(
				(p) => p.preference_key === preferenceKey
			);
			if (preferenceValue === 'any') {
				if (existingPreference) {
					await PreferencesService.deletePreference(
						existingPreference.preferences_id
					);
				}
			} else {
				if (existingPreference) {
					await PreferencesService.updatePreference(
						existingPreference.preferences_id,
						{ preferenceKey, preferenceValue }
					);
				} else {
					await PreferencesService.addPreference({
						preferenceKey,
						preferenceValue,
					});
				}
			}

			fetchPreferences();
		} catch (error) {
			console.error('Failed to add/update preference:', error);
		}
	};

	const handlePreferenceChange = (category, value) => {
		setPreferenceValues((prevValues) => ({
			...prevValues,
			[category]: value,
		}));
		handleAddOrUpdatePreference(category, value);
	};

	const handleDeletePreference = async (id) => {
		try {
			await PreferencesService.deletePreference(id);
			fetchPreferences();
		} catch (error) {
			console.error('Failed to delete preference:', error);
		}
	};

	const capitalizeFirstLetter = (str) => {
		return (
			str.charAt(0).toUpperCase() +
			str.slice(1).toLowerCase().replace(/_/g, ' ')
		);
	};

	const categoryPairs = [];
	const categories = Object.keys(allowedPreferences);
	for (let i = 0; i < categories.length; i += 2) {
		categoryPairs.push(categories.slice(i, i + 2));
	}

	return (
		<form className='space-y-4'>
			{categoryPairs.map((pair, idx) => (
				<div key={idx} className='flex flex-wrap -mx-2'>
					{pair.map((category) => (
						<div key={category} className='w-full md:w-1/2 px-2 mb-4'>
							<div className='bg-white shadow-md rounded-lg p-4'>
								<label className='block font-bold mb-2'>
									{capitalizeFirstLetter(category)}
								</label>
								<div className='grid grid-cols-2 gap-2'>
									<label className='flex items-center'>
										<input
											type='radio'
											name={category}
											value='any'
											checked={preferenceValues[category] === 'any'}
											onChange={() => handlePreferenceChange(category, 'any')}
											className='form-radio'
										/>
										<span className='ml-2'>Any</span>
									</label>
									{allowedPreferences[category].map((value, idx) => (
										<label key={idx} className='flex items-center'>
											<input
												type='radio'
												name={category}
												value={value}
												checked={preferenceValues[category] === value}
												onChange={() => handlePreferenceChange(category, value)}
												className='form-radio'
											/>
											<span className='ml-2'>
												{capitalizeFirstLetter(value)}
											</span>
										</label>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			))}
		</form>
	);
};

export default PreferencesManager;
