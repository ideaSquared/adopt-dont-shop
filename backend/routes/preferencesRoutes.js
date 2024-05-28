// Import necessary modules and files.
import express from 'express';
import { pool } from '../dbConnection.js';
import authenticateToken from '../middleware/authenticateToken.js';
import checkAdmin from '../middleware/checkAdmin.js'; // Middleware to check if the authenticated user is an admin.
import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';

const router = express.Router();
const logger = new LoggerUtil('preferencesService').getLogger(); // Initialize logger for this service

// Define allowed preference keys and their values
// We're storing these here rather than in a database as I don't foresee them changing often, and managing the database changes vs in code is much more managable for me.
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

// Helper function to validate preference key and value
const isValidPreference = (key, value) => {
	return (
		allowedPreferences.hasOwnProperty(key) &&
		allowedPreferences[key].includes(value)
	);
};

// POST route to add a new preference
router.post('/', authenticateToken, async (req, res) => {
	const { preferenceKey, preferenceValue } = req.body;
	const userId = req.user.userId; // Extract userId from the authenticated user

	// Validate preference key and value
	if (!isValidPreference(preferenceKey, preferenceValue)) {
		return res.status(400).json({ message: 'Invalid preference key or value' });
	}

	try {
		const insertQuery = `
            INSERT INTO user_preferences (user_id, preference_key, preference_value)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
		const result = await pool.query(insertQuery, [
			userId,
			preferenceKey,
			preferenceValue,
		]);
		logger.info(
			`${userId} created preferences for ${preferenceKey} to ${preferenceValue}`
		);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		logger.error('Failed to add preference:', error);
		res.status(500).json({ message: 'Failed to add preference' });
	}
});

// PUT route to update an existing preference
router.put('/:id', authenticateToken, async (req, res) => {
	const { preferenceKey, preferenceValue } = req.body;
	const { id } = req.params;
	const userId = req.user.userId; // Extract userId from the authenticated user

	// Validate preference key and value
	if (!isValidPreference(preferenceKey, preferenceValue)) {
		return res.status(400).json({ message: 'Invalid preference key or value' });
	}

	try {
		const updateQuery = `
            UPDATE user_preferences
            SET preference_key = $1, preference_value = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING *;
        `;
		const result = await pool.query(updateQuery, [
			preferenceKey,
			preferenceValue,
			id,
		]);
		if (result.rowCount === 0) {
			return res.status(404).json({ message: 'Preference not found' });
		}
		logger.info(
			`${userId} set preferences for ${preferenceKey} to ${preferenceValue}`
		);
		res.status(200).json(result.rows[0]);
	} catch (error) {
		logger.error('Failed to update preference:', error);
		res.status(500).json({ message: 'Failed to update preference' });
	}
});

// DELETE route to remove a preference
router.delete('/:id', authenticateToken, async (req, res) => {
	const { id } = req.params;
	const userId = req.user.userId; // Extract userId from the authenticated user
	try {
		const deleteQuery = `
            DELETE FROM user_preferences
            WHERE id = $1
            RETURNING *;
        `;
		const result = await pool.query(deleteQuery, [id]);
		if (result.rowCount === 0) {
			return res.status(404).json({ message: 'Preference not found' });
		}
		logger.info(
			`${userId} successfully deleted ${result.rows[0].preference_key}`
		);
		res.status(200).json({
			message: 'Preference deleted',
			deletedPreference: result.rows[0],
		});
	} catch (error) {
		logger.error('Failed to delete preference:', error);
		res.status(500).json({ message: 'Failed to delete preference' });
	}
});

// GET route to get all preferences
router.get('/', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const query = 'SELECT * FROM user_preferences;';
		const result = await pool.query(query);
		res.status(200).json(result.rows);
	} catch (error) {
		logger.error('Failed to get preferences:', error);
		res.status(500).json({ message: 'Failed to get preferences' });
	}
});

// GET route to get all preferences by user
router.get('/user', authenticateToken, async (req, res) => {
	const userId = req.user.userId; // Extract userId from the authenticated user
	try {
		const query = 'SELECT * FROM user_preferences WHERE user_id = $1;';
		const result = await pool.query(query, [userId]);
		res.status(200).json(result.rows);
	} catch (error) {
		logger.error(`Failed to get preferences for user ${userId}:`, error);
		res.status(500).json({ message: 'Failed to get preferences' });
	}
});

export default router;
