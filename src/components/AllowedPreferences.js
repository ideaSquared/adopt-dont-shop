// AllowedPreferences.js
const AllowedPreferences = () => {
	return {
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
		commitment_level: ['first_time', 'active', 'relaxed'],
	};
};

export default AllowedPreferences;
