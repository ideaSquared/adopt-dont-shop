import React, { useState, useEffect } from 'react';
import {
	Form,
	Row,
	Col,
	ToggleButton,
	ToggleButtonGroup,
} from 'react-bootstrap';
import PreferencesService from '../../services/PreferencesService';
import AllowedPreferences from '../../components/AllowedPreferences';

// Get the allowed preferences
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
			// Set 'any' as the default value if no preference exists for a category
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

	return (
		<Form>
			{Object.keys(allowedPreferences).map((category) => (
				<Row key={category} className='mb-3'>
					<Col md={3}>
						<Form.Label>
							<strong>{capitalizeFirstLetter(category)}</strong>
						</Form.Label>
					</Col>
					<Col md={9}>
						<ToggleButtonGroup
							className='flex-wrap'
							type='radio'
							name={category}
							value={preferenceValues[category] || 'any'}
							onChange={(val) => handlePreferenceChange(category, val)}
						>
							<ToggleButton
								id={`tbg-radio-${category}-any`}
								value='any'
								variant={
									preferenceValues[category] === 'any'
										? 'primary'
										: 'outline-primary'
								}
							>
								Any
							</ToggleButton>
							{allowedPreferences[category].map((value, idx) => (
								<ToggleButton
									className='preference-button'
									key={idx}
									id={`tbg-radio-${category}-${idx}`}
									value={value}
									variant={
										preferenceValues[category] === value
											? 'primary'
											: 'outline-primary'
									}
								>
									{capitalizeFirstLetter(value)}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Col>
				</Row>
			))}
		</Form>
	);
};

export default PreferencesManager;
