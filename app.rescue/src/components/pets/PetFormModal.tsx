import React, { useState, useEffect } from 'react';
import { Card, Button } from '@adopt-dont-shop/lib.components';
import { Pet, PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib.pets';
import * as styles from './PetFormModal.css';

interface PetFormModalProps {
  isOpen: boolean;
  pet?: Pet;
  onClose: () => void;
  onSubmit: (data: PetCreateData | PetUpdateData) => Promise<void>;
}

const PetFormModal: React.FC<PetFormModalProps> = ({ isOpen, pet, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<PetCreateData>({
    name: '',
    type: 'dog',
    breed: '',
    rescueId: '', // Will be set when submitting
    ageYears: 0,
    ageMonths: 0,
    gender: 'male',
    size: 'medium',
    color: '',
    adoptionFee: '',
    shortDescription: '',
    longDescription: '',
    specialNeeds: false,
    houseTrained: false,
    goodWithChildren: undefined,
    goodWithDogs: undefined,
    goodWithCats: undefined,
    energyLevel: 'medium',
    temperament: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        rescueId: pet.rescue_id,
        secondaryBreed: pet.secondary_breed,
        ageYears: pet.age_years,
        ageMonths: pet.age_months,
        gender: pet.gender,
        size: pet.size,
        color: pet.color,
        markings: pet.markings,
        weightKg: pet.weight_kg,
        adoptionFee: pet.adoption_fee,
        shortDescription: pet.short_description,
        longDescription: pet.long_description,
        specialNeeds: pet.special_needs,
        specialNeedsDescription: pet.special_needs_description,
        houseTrained: pet.house_trained,
        goodWithChildren: pet.good_with_children,
        goodWithDogs: pet.good_with_dogs,
        goodWithCats: pet.good_with_cats,
        goodWithSmallAnimals: pet.good_with_small_animals,
        energyLevel: pet.energy_level,
        exerciseNeeds: pet.exercise_needs,
        groomingNeeds: pet.grooming_needs,
        temperament: pet.temperament,
        medicalNotes: pet.medical_notes,
        behavioralNotes: pet.behavioral_notes,
      });
    } else {
      setFormData({
        name: '',
        type: 'dog',
        breed: '',
        rescueId: '',
        ageYears: 0,
        ageMonths: 0,
        gender: 'male',
        size: 'medium',
        color: '',
        adoptionFee: '',
        shortDescription: '',
        longDescription: '',
        specialNeeds: false,
        houseTrained: false,
        goodWithChildren: undefined,
        goodWithDogs: undefined,
        goodWithCats: undefined,
        energyLevel: 'medium',
        temperament: [],
      });
    }
    setErrors({});
  }, [pet, isOpen]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }) as typeof prev);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pet name is required';
    }

    if (!formData.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }

    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    if (!formData.shortDescription?.trim()) {
      newErrors.shortDescription = 'Short description is required';
    }

    if (
      (formData.ageYears || 0) < 0 ||
      (formData.ageMonths || 0) < 0 ||
      (formData.ageMonths || 0) > 11
    ) {
      newErrors.age = 'Please enter a valid age';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting pet form:', error);
      setErrors({ submit: 'Failed to save pet. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <Card className={styles.modalContent} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <h2>{pet ? 'Edit Pet' : 'Add New Pet'}</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup()}>
              <label htmlFor="name">Pet Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter pet's name"
              />
              {errors.name && <div className="error">{errors.name}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="type">Pet Type *</label>
              <select
                id="type"
                value={formData.type}
                onChange={e => handleInputChange('type', e.target.value)}
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="rabbit">Rabbit</option>
                <option value="bird">Bird</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="breed">Primary Breed *</label>
              <input
                id="breed"
                type="text"
                value={formData.breed}
                onChange={e => handleInputChange('breed', e.target.value)}
                placeholder="Enter primary breed"
              />
              {errors.breed && <div className="error">{errors.breed}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="secondaryBreed">Secondary Breed</label>
              <input
                id="secondaryBreed"
                type="text"
                value={formData.secondaryBreed || ''}
                onChange={e => handleInputChange('secondaryBreed', e.target.value)}
                placeholder="Enter secondary breed (if mix)"
              />
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="ageYears">Age (Years)</label>
              <input
                id="ageYears"
                type="number"
                min="0"
                max="30"
                value={formData.ageYears}
                onChange={e => handleInputChange('ageYears', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="ageMonths">Age (Months)</label>
              <input
                id="ageMonths"
                type="number"
                min="0"
                max="11"
                value={formData.ageMonths}
                onChange={e => handleInputChange('ageMonths', parseInt(e.target.value) || 0)}
              />
              {errors.age && <div className="error">{errors.age}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="size">Size *</label>
              <select
                id="size"
                value={formData.size}
                onChange={e => handleInputChange('size', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra_large">Extra Large</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="color">Color *</label>
              <input
                id="color"
                type="text"
                value={formData.color}
                onChange={e => handleInputChange('color', e.target.value)}
                placeholder="Enter primary color"
              />
              {errors.color && <div className="error">{errors.color}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="adoptionFee">Adoption Fee</label>
              <input
                id="adoptionFee"
                type="text"
                value={formData.adoptionFee || ''}
                onChange={e => handleInputChange('adoptionFee', e.target.value)}
                placeholder="Enter adoption fee (e.g., 150.00)"
              />
            </div>

            <div className={styles.formGroup({ fullWidth: true })}>
              <label htmlFor="shortDescription">Short Description *</label>
              <textarea
                id="shortDescription"
                value={formData.shortDescription || ''}
                onChange={e => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief description for listings (1-2 sentences)"
                rows={2}
              />
              {errors.shortDescription && <div className="error">{errors.shortDescription}</div>}
            </div>

            <div className={styles.formGroup({ fullWidth: true })}>
              <label htmlFor="longDescription">Long Description</label>
              <textarea
                id="longDescription"
                value={formData.longDescription || ''}
                onChange={e => handleInputChange('longDescription', e.target.value)}
                placeholder="Detailed description of the pet's personality, history, and needs"
                rows={4}
              />
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="energyLevel">Energy Level</label>
              <select
                id="energyLevel"
                value={formData.energyLevel}
                onChange={e => handleInputChange('energyLevel', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="specialNeeds"
                  checked={formData.specialNeeds}
                  onChange={e => handleInputChange('specialNeeds', e.target.checked)}
                />
                <label htmlFor="specialNeeds">Special Needs</label>
              </div>
            </div>

            <div className={styles.formGroup()}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="houseTrained"
                  checked={formData.houseTrained}
                  onChange={e => handleInputChange('houseTrained', e.target.checked)}
                />
                <label htmlFor="houseTrained">House Trained</label>
              </div>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithChildren">Good with Children</label>
              <select
                id="goodWithChildren"
                value={
                  formData.goodWithChildren === null || formData.goodWithChildren === undefined
                    ? ''
                    : formData.goodWithChildren.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithChildren',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithDogs">Good with Dogs</label>
              <select
                id="goodWithDogs"
                value={
                  formData.goodWithDogs === null || formData.goodWithDogs === undefined
                    ? ''
                    : formData.goodWithDogs.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithDogs',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithCats">Good with Cats</label>
              <select
                id="goodWithCats"
                value={
                  formData.goodWithCats === null || formData.goodWithCats === undefined
                    ? ''
                    : formData.goodWithCats.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithCats',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}

          <div className={styles.modalActions}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PetFormModal;
