import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Button } from '@adopt-dont-shop/components';
import { Pet, PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib-pets';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;

  h2 {
    margin: 0 0 1.5rem 0;
    color: ${props => props.theme.text.primary};
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ fullWidth?: boolean }>`
  ${props => props.fullWidth && 'grid-column: 1 / -1;'}

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: ${props => props.theme.text.primary};
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid ${props => props.theme.colors.neutral[300]};
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary[500]};
      box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  .error {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;

  input[type='checkbox'] {
    width: auto;
  }

  label {
    margin: 0;
    font-weight: normal;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.colors.neutral[200]};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

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
      // Populate form with existing pet data for editing
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
      // Reset form for new pet
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <h2>{pet ? 'Edit Pet' : 'Add New Pet'}</h2>

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <label htmlFor="name">Pet Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter pet's name"
              />
              {errors.name && <div className="error">{errors.name}</div>}
            </FormGroup>

            <FormGroup>
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
            </FormGroup>

            <FormGroup>
              <label htmlFor="breed">Primary Breed *</label>
              <input
                id="breed"
                type="text"
                value={formData.breed}
                onChange={e => handleInputChange('breed', e.target.value)}
                placeholder="Enter primary breed"
              />
              {errors.breed && <div className="error">{errors.breed}</div>}
            </FormGroup>

            <FormGroup>
              <label htmlFor="secondaryBreed">Secondary Breed</label>
              <input
                id="secondaryBreed"
                type="text"
                value={formData.secondaryBreed || ''}
                onChange={e => handleInputChange('secondaryBreed', e.target.value)}
                placeholder="Enter secondary breed (if mix)"
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="ageYears">Age (Years)</label>
              <input
                id="ageYears"
                type="number"
                min="0"
                max="30"
                value={formData.ageYears}
                onChange={e => handleInputChange('ageYears', parseInt(e.target.value) || 0)}
              />
            </FormGroup>

            <FormGroup>
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
            </FormGroup>

            <FormGroup>
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </FormGroup>

            <FormGroup>
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
            </FormGroup>

            <FormGroup>
              <label htmlFor="color">Color *</label>
              <input
                id="color"
                type="text"
                value={formData.color}
                onChange={e => handleInputChange('color', e.target.value)}
                placeholder="Enter primary color"
              />
              {errors.color && <div className="error">{errors.color}</div>}
            </FormGroup>

            <FormGroup>
              <label htmlFor="adoptionFee">Adoption Fee</label>
              <input
                id="adoptionFee"
                type="text"
                value={formData.adoptionFee || ''}
                onChange={e => handleInputChange('adoptionFee', e.target.value)}
                placeholder="Enter adoption fee (e.g., 150.00)"
              />
            </FormGroup>

            <FormGroup fullWidth>
              <label htmlFor="shortDescription">Short Description *</label>
              <textarea
                id="shortDescription"
                value={formData.shortDescription || ''}
                onChange={e => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief description for listings (1-2 sentences)"
                rows={2}
              />
              {errors.shortDescription && <div className="error">{errors.shortDescription}</div>}
            </FormGroup>

            <FormGroup fullWidth>
              <label htmlFor="longDescription">Long Description</label>
              <textarea
                id="longDescription"
                value={formData.longDescription || ''}
                onChange={e => handleInputChange('longDescription', e.target.value)}
                placeholder="Detailed description of the pet's personality, history, and needs"
                rows={4}
              />
            </FormGroup>

            <FormGroup>
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
            </FormGroup>

            <FormGroup>
              <CheckboxGroup>
                <input
                  type="checkbox"
                  id="specialNeeds"
                  checked={formData.specialNeeds}
                  onChange={e => handleInputChange('specialNeeds', e.target.checked)}
                />
                <label htmlFor="specialNeeds">Special Needs</label>
              </CheckboxGroup>
            </FormGroup>

            <FormGroup>
              <CheckboxGroup>
                <input
                  type="checkbox"
                  id="houseTrained"
                  checked={formData.houseTrained}
                  onChange={e => handleInputChange('houseTrained', e.target.checked)}
                />
                <label htmlFor="houseTrained">House Trained</label>
              </CheckboxGroup>
            </FormGroup>

            <FormGroup>
              <label htmlFor="goodWithChildren">Good with Children</label>
              <select
                id="goodWithChildren"
                value={
                  formData.goodWithChildren == null ? '' : formData.goodWithChildren.toString()
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
            </FormGroup>

            <FormGroup>
              <label htmlFor="goodWithDogs">Good with Dogs</label>
              <select
                id="goodWithDogs"
                value={formData.goodWithDogs == null ? '' : formData.goodWithDogs.toString()}
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
            </FormGroup>

            <FormGroup>
              <label htmlFor="goodWithCats">Good with Cats</label>
              <select
                id="goodWithCats"
                value={formData.goodWithCats == null ? '' : formData.goodWithCats.toString()}
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
            </FormGroup>
          </FormGrid>

          {errors.submit && (
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{errors.submit}</div>
          )}

          <ModalActions>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
            </Button>
          </ModalActions>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default PetFormModal;
