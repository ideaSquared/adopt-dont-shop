import React, { useState, useEffect } from 'react';
import {
	Form,
	Row,
	Col,
	Card,
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

	// Split categories into pairs for each row
	const categoryPairs = [];
	const categories = Object.keys(allowedPreferences);
	for (let i = 0; i < categories.length; i += 2) {
		categoryPairs.push(categories.slice(i, i + 2));
	}

	return (
		<Form>
			{categoryPairs.map((pair, idx) => (
				<Row key={idx} className='mb-3'>
					{pair.map((category) => (
						<Col md={6} key={category}>
							<Card className='mb-3'>
								<Card.Body>
									<Form.Label>
										<strong>{capitalizeFirstLetter(category)}</strong>
									</Form.Label>
									<Row className='text-center'>
										<Col xs={12} sm={6} className='mb-3'>
											<ToggleButtonGroup
												type='radio'
												name={category}
												value={preferenceValues[category] || 'any'}
												onChange={(val) =>
													handlePreferenceChange(category, val)
												}
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
											</ToggleButtonGroup>
										</Col>
										{allowedPreferences[category].map((value, idx) => (
											<Col xs={12} sm={6} key={idx} className='mb-3'>
												<ToggleButtonGroup
													type='radio'
													name={category}
													value={preferenceValues[category] || 'any'}
													onChange={(val) =>
														handlePreferenceChange(category, val)
													}
												>
													<ToggleButton
														id={`tbg-radio-${category}-${value}`}
														value={value}
														variant={
															preferenceValues[category] === value
																? 'primary'
																: 'outline-primary'
														}
													>
														{capitalizeFirstLetter(value)}
													</ToggleButton>
												</ToggleButtonGroup>
											</Col>
										))}
									</Row>
								</Card.Body>
							</Card>
						</Col>
					))}
				</Row>
			))}
		</Form>
	);
};

export default PreferencesManager;
