import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Container, Row, Col } from 'react-bootstrap';
import PreferencesService from '../../services/PreferencesService';

const allowedPreferences = {
	other_pets: [
		'prefers_only_pet_household',
		'coexist_with_cats',
		'coexist_with_dogs',
		'friendly_with_small_animals',
		'live_with_specific_pet',
		'not_live_with_specific_pet',
		'needs_adopt_with_companion',
		'can_adapt_if_alone',
	],
	household: [
		'prefers_living_indoors',
		'strictly_indoor_due_to_health',
		'enjoys_indoor_outdoor',
		'prefers_spending_outdoors',
		'needs_outdoor_space',
	],
	energy: [
		'full_of_energy',
		'moderately_active',
		'shy_and_reserved',
		'enjoys_human_company',
		'independent_self_sufficient',
	],
	family: [
		'suitable_for_young_children',
		'best_suited_for_teenagers',
		'ideal_for_older_children_or_adults',
		'prefers_single_adult_household',
		'needs_quiet_home_without_children',
	],
	temperament: [
		'confident_and_sociable',
		'timid_with_patience',
		'highly_trainable',
		'needs_experienced_owner',
	],
	health: [
		'special_needs',
		'dietary_restrictions',
		'senior_pet',
		'recently_rehabilitated',
	],
	size: ['small', 'medium', 'large', 'extra_large'],
	grooming_needs: [
		'low_maintenance',
		'regular_grooming_needed',
		'high_maintenance',
	],
	training_socialization: [
		'basic_training_completed',
		'obedience_trained',
		'socialized_with_multiple_species',
		'needs_socialization',
	],
	commitment_level: [
		'ideal_for_first_time_owners',
		'needs_active_lifestyle',
		'suitable_for_relaxed_lifestyle',
	],
};

const isValidPreference = (category, key) => {
	return (
		allowedPreferences.hasOwnProperty(category) &&
		allowedPreferences[category].includes(key)
	);
};

const PreferencesManager = () => {
	const [preferences, setPreferences] = useState([]);
	const [preferenceCategory, setPreferenceCategory] = useState('');
	const [preferenceValue, setPreferenceValue] = useState('');
	const [editingPreference, setEditingPreference] = useState(null);

	useEffect(() => {
		fetchPreferences();
	}, []);

	const fetchPreferences = async () => {
		try {
			const data = await PreferencesService.fetchUserPreferences();
			setPreferences(data);
		} catch (error) {
			console.error('Failed to fetch preferences:', error);
		}
	};

	const handleAddOrUpdatePreference = async (e) => {
		e.preventDefault();
		const newPreference = {
			preferenceKey: preferenceCategory,
			preferenceValue,
		};
		if (!isValidPreference(preferenceCategory, preferenceValue)) {
			alert('Invalid preference key or value');
			return;
		}

		try {
			if (editingPreference) {
				await PreferencesService.updatePreference(
					editingPreference.preferences_id,
					newPreference
				);
			} else {
				await PreferencesService.addPreference(newPreference);
			}
			setPreferenceCategory('');
			setPreferenceValue('');
			setEditingPreference(null);
			fetchPreferences();
		} catch (error) {
			console.error('Failed to add/update preference:', error);
		}
	};

	const handleEditPreference = (preference) => {
		setPreferenceCategory(preference.preference_key);
		setPreferenceValue(preference.preference_value);
		setEditingPreference(preference);
	};

	const handleDeletePreference = async (id) => {
		try {
			await PreferencesService.deletePreference(id);
			fetchPreferences();
		} catch (error) {
			console.error('Failed to delete preference:', error);
		}
	};

	return (
		<Container>
			<Row>
				<Col>
					<h2>Manage Preferences</h2>
					<Form onSubmit={handleAddOrUpdatePreference}>
						<Form.Group controlId='preferenceCategory'>
							<Form.Label>Preference Category</Form.Label>
							<Form.Control
								as='select'
								value={preferenceCategory}
								onChange={(e) => {
									setPreferenceCategory(e.target.value);
									setPreferenceValue('');
								}}
								required
							>
								<option value=''>Select Category</option>
								{Object.keys(allowedPreferences).map((category) => (
									<option key={category} value={category}>
										{category.replace(/_/g, ' ')}
									</option>
								))}
							</Form.Control>
						</Form.Group>
						<Form.Group controlId='preferenceValue'>
							<Form.Label>Preference</Form.Label>
							<Form.Control
								as='select'
								value={preferenceValue}
								onChange={(e) => setPreferenceValue(e.target.value)}
								required
								disabled={!preferenceCategory}
							>
								<option value=''>Select Preference</option>
								{preferenceCategory &&
									allowedPreferences[preferenceCategory].map((value) => (
										<option key={value} value={value}>
											{value.replace(/_/g, ' ')}
										</option>
									))}
							</Form.Control>
						</Form.Group>
						<Button variant='primary' type='submit'>
							{editingPreference ? 'Update Preference' : 'Add Preference'}
						</Button>
					</Form>
				</Col>
			</Row>
			<Row>
				<Col>
					<h3>Preferences List</h3>
					<Table striped bordered hover>
						<thead>
							<tr>
								<th>ID</th>
								<th>Category</th>
								<th>Preference</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{preferences.map((preference) => (
								<tr key={preference.preferences_id}>
									<td>{preference.preferences_id}</td>
									<td>{preference.preference_key.replace(/_/g, ' ')}</td>
									<td>{preference.preference_value.replace(/_/g, ' ')}</td>
									<td>
										<Button
											variant='warning'
											onClick={() => handleEditPreference(preference)}
										>
											Edit
										</Button>{' '}
										<Button
											variant='danger'
											onClick={() =>
												handleDeletePreference(preference.preferences_id)
											}
										>
											Delete
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</Table>
				</Col>
			</Row>
		</Container>
	);
};

export default PreferencesManager;
