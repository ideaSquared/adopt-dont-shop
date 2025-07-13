import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { applicationProfileService } from '../services/applicationProfileService';
import { ApplicationDefaults, ProfileCompletionResponse } from '../types/enhanced-profile';

/**
 * Phase 1 - Profile Setup Page
 * Comprehensive profile completion wizard for application defaults
 */

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    color: ${props => props.theme.colors.neutral[900]};
    margin-bottom: 0.5rem;
  }

  p {
    color: ${props => props.theme.colors.neutral[600]};
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .completion-bar {
    background: ${props => props.theme.colors.neutral[200]};
    border-radius: 8px;
    height: 8px;
    overflow: hidden;
    margin: 1rem auto;
    max-width: 300px;

    .progress {
      background: linear-gradient(90deg, #4caf50, #81c784);
      height: 100%;
      transition: width 0.3s ease;
    }
  }
`;

const SectionCard = styled.div<{ isComplete?: boolean }>`
  background: white;
  border: 2px solid
    ${props =>
      props.isComplete
        ? props.theme.colors.semantic.success[200]
        : props.theme.colors.neutral[200]};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props =>
      props.isComplete
        ? props.theme.colors.semantic.success[300]
        : props.theme.colors.primary[300]};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  h2 {
    color: ${props => props.theme.colors.neutral[900]};
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${props =>
        props.isComplete
          ? props.theme.colors.semantic.success[500]
          : props.theme.colors.neutral[300]};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }
  }

  p {
    color: ${props => props.theme.colors.neutral[600]};
    margin-bottom: 1.5rem;
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

const FormGroup = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.colors.neutral[700]};
    font-weight: 500;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid ${props => props.theme.colors.neutral[300]};
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary[500]};
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }
`;

const FullWidthField = styled(FormGroup)`
  grid-column: 1 / -1;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;

  input[type='checkbox'] {
    width: auto;
  }
`;

const ReferenceItem = styled.div`
  background: ${props => props.theme.colors.neutral[50]};
  border: 1px solid ${props => props.theme.colors.neutral[200]};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  h4 {
    margin-bottom: 0.5rem;
    color: ${props => props.theme.colors.neutral[800]};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 3rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

interface PersonalReference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  yearsKnown: number;
}

export const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const returnTo = searchParams.get('returnTo');

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<ProfileCompletionResponse | null>(null);

  // Form data state
  const [formData, setFormData] = useState<ApplicationDefaults>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
      dateOfBirth: '',
      occupation: '',
    },
    livingSituation: {
      housingType: 'apartment',
      isOwned: false,
      hasYard: false,
      allowsPets: true,
      householdSize: 1,
      householdMembers: [],
      hasAllergies: false,
      allergyDetails: '',
    },
    petExperience: {
      experienceLevel: 'beginner',
      hasPetsCurrently: false,
      currentPets: [],
      previousPets: [],
      willingToTrain: true,
      hoursAloneDaily: 0,
      exercisePlans: '',
    },
    references: {
      personal: [] as PersonalReference[],
    },
  });

  const loadProfileData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get completion status
      const completion = await applicationProfileService.getProfileCompletion();
      setCompletionData(completion);

      // Get existing defaults if any
      const defaults = await applicationProfileService.getApplicationDefaults();
      if (defaults) {
        setFormData(prevData => ({
          ...prevData,
          ...defaults,
          personalInfo: {
            ...prevData.personalInfo,
            ...defaults.personalInfo,
            // Always use current user data for basic fields
            firstName: user?.firstName || defaults.personalInfo?.firstName || '',
            lastName: user?.lastName || defaults.personalInfo?.lastName || '',
            email: user?.email || defaults.personalInfo?.email || '',
            phone: user?.phoneNumber || defaults.personalInfo?.phone || '',
            address: user?.addressLine1 || defaults.personalInfo?.address || '',
            city: user?.city || defaults.personalInfo?.city || '',
            postcode: user?.postalCode || defaults.personalInfo?.postcode || '',
            country: user?.country || defaults.personalInfo?.country || 'United Kingdom',
          },
        }));
      } else {
        // Initialize with user data
        setFormData(prevData => ({
          ...prevData,
          personalInfo: {
            ...prevData.personalInfo,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phoneNumber || '',
            address: user?.addressLine1 || '',
            city: user?.city || '',
            postcode: user?.postalCode || '',
            country: user?.country || 'United Kingdom',
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setError('Failed to load profile information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadProfileData();
  }, [isAuthenticated, authLoading, navigate, loadProfileData]);

  const handleInputChange = (field: string, value: string | number | boolean, section?: string) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof ApplicationDefaults],
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleAddReference = () => {
    const newReference: PersonalReference = {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      yearsKnown: 0,
    };

    setFormData(prev => ({
      ...prev,
      references: {
        ...prev.references,
        personal: [...(prev.references?.personal || []), newReference],
      },
    }));
  };

  const handleUpdateReference = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      references: {
        ...prev.references,
        personal:
          prev.references?.personal?.map((ref, i) =>
            i === index
              ? {
                  ...ref,
                  [field]: field === 'yearsKnown' ? parseInt(value) || 0 : value,
                }
              : ref
          ) || [],
      },
    }));
  };

  const handleRemoveReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      references: {
        ...prev.references,
        personal: prev.references?.personal?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await applicationProfileService.updateApplicationDefaults(formData);

      setSuccessMessage('Profile updated successfully!');

      // Refresh completion data
      const updatedCompletion = await applicationProfileService.getProfileCompletion();
      setCompletionData(updatedCompletion);

      // If we came from an application flow and profile is now complete, redirect back
      if (returnTo && updatedCompletion.canQuickApply) {
        setTimeout(() => {
          navigate(decodeURIComponent(returnTo));
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueAnyway = () => {
    if (returnTo) {
      navigate(decodeURIComponent(returnTo));
    } else {
      navigate('/');
    }
  };

  if (authLoading || isLoading) {
    return (
      <Container>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          <Spinner size='lg' />
        </div>
      </Container>
    );
  }

  const completionPercentage = completionData?.completionStatus?.overall_percentage || 0;

  return (
    <Container>
      <Header>
        <h1>Complete Your Adoption Profile</h1>
        <p>Help us understand you better to streamline your adoption applications</p>
        <div className='completion-bar'>
          <div className='progress' style={{ width: `${completionPercentage}%` }} />
        </div>
        <p>{completionPercentage}% Complete</p>
      </Header>

      {error && (
        <Alert variant='error' title='Error' onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant='success' title='Success' onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Personal Information */}
      <SectionCard isComplete={completionData?.completionStatus?.basic_info}>
        <h2>
          <span className='icon'>{completionData?.completionStatus?.basic_info ? '✓' : '1'}</span>
          Personal Information
        </h2>
        <p>Your basic contact information (auto-filled from your account)</p>

        <FormGrid>
          <FormGroup>
            <label htmlFor='firstName'>First Name</label>
            <input
              id='firstName'
              type='text'
              value={formData.personalInfo?.firstName || ''}
              onChange={e => handleInputChange('firstName', e.target.value, 'personalInfo')}
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='lastName'>Last Name</label>
            <input
              id='lastName'
              type='text'
              value={formData.personalInfo?.lastName || ''}
              onChange={e => handleInputChange('lastName', e.target.value, 'personalInfo')}
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='email'>Email Address</label>
            <input
              id='email'
              type='email'
              value={formData.personalInfo?.email || ''}
              onChange={e => handleInputChange('email', e.target.value, 'personalInfo')}
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='phone'>Phone Number</label>
            <input
              id='phone'
              type='tel'
              value={formData.personalInfo?.phone || ''}
              onChange={e => handleInputChange('phone', e.target.value, 'personalInfo')}
              placeholder='07123 456789'
              required
            />
          </FormGroup>
          <FullWidthField>
            <label htmlFor='address'>Street Address</label>
            <input
              id='address'
              type='text'
              value={formData.personalInfo?.address || ''}
              onChange={e => handleInputChange('address', e.target.value, 'personalInfo')}
              required
            />
          </FullWidthField>
          <FormGroup>
            <label htmlFor='city'>City</label>
            <input
              id='city'
              type='text'
              value={formData.personalInfo?.city || ''}
              onChange={e => handleInputChange('city', e.target.value, 'personalInfo')}
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='county'>County</label>
            <input
              id='county'
              type='text'
              value={formData.personalInfo?.county || ''}
              onChange={e => handleInputChange('county', e.target.value, 'personalInfo')}
              placeholder='e.g. Greater Manchester'
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='postcode'>Postcode</label>
            <input
              id='postcode'
              type='text'
              value={formData.personalInfo?.postcode || ''}
              onChange={e => handleInputChange('postcode', e.target.value, 'personalInfo')}
              placeholder='M14 5TB'
              required
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='dateOfBirth'>Date of Birth</label>
            <input
              id='dateOfBirth'
              type='date'
              value={formData.personalInfo?.dateOfBirth || ''}
              onChange={e => handleInputChange('dateOfBirth', e.target.value, 'personalInfo')}
            />
          </FormGroup>
          <FormGroup>
            <label htmlFor='occupation'>Occupation</label>
            <input
              id='occupation'
              type='text'
              value={formData.personalInfo?.occupation || ''}
              onChange={e => handleInputChange('occupation', e.target.value, 'personalInfo')}
            />
          </FormGroup>
        </FormGrid>
      </SectionCard>

      {/* Living Situation */}
      <SectionCard isComplete={completionData?.completionStatus?.living_situation}>
        <h2>
          <span className='icon'>
            {completionData?.completionStatus?.living_situation ? '✓' : '2'}
          </span>
          Living Situation
        </h2>
        <p>Tell us about your home environment</p>

        <FormGrid>
          <FormGroup>
            <label htmlFor='housingType'>Housing Type</label>
            <select
              id='housingType'
              value={formData.livingSituation?.housingType || 'apartment'}
              onChange={e => handleInputChange('housingType', e.target.value, 'livingSituation')}
            >
              <option value='apartment'>Apartment</option>
              <option value='house'>House</option>
              <option value='townhouse'>Townhouse</option>
              <option value='condo'>Condo</option>
              <option value='other'>Other</option>
            </select>
          </FormGroup>
          <FormGroup>
            <label htmlFor='householdSize'>Household Size</label>
            <input
              id='householdSize'
              type='number'
              min='1'
              value={formData.livingSituation?.householdSize || 1}
              onChange={e =>
                handleInputChange('householdSize', parseInt(e.target.value), 'livingSituation')
              }
            />
          </FormGroup>
        </FormGrid>

        <CheckboxGroup>
          <input
            id='isOwned'
            type='checkbox'
            checked={formData.livingSituation?.isOwned || false}
            onChange={e => handleInputChange('isOwned', e.target.checked, 'livingSituation')}
          />
          <label htmlFor='isOwned'>I own my home</label>
        </CheckboxGroup>

        <CheckboxGroup>
          <input
            id='hasYard'
            type='checkbox'
            checked={formData.livingSituation?.hasYard || false}
            onChange={e => handleInputChange('hasYard', e.target.checked, 'livingSituation')}
          />
          <label htmlFor='hasYard'>I have a yard or garden</label>
        </CheckboxGroup>

        <CheckboxGroup>
          <input
            id='hasAllergies'
            type='checkbox'
            checked={formData.livingSituation?.hasAllergies || false}
            onChange={e => handleInputChange('hasAllergies', e.target.checked, 'livingSituation')}
          />
          <label htmlFor='hasAllergies'>Someone in household has pet allergies</label>
        </CheckboxGroup>

        {formData.livingSituation?.hasAllergies && (
          <FormGroup>
            <label htmlFor='allergyDetails'>Allergy Details</label>
            <input
              id='allergyDetails'
              type='text'
              value={formData.livingSituation?.allergyDetails || ''}
              onChange={e => handleInputChange('allergyDetails', e.target.value, 'livingSituation')}
              placeholder='Please describe the allergies'
            />
          </FormGroup>
        )}
      </SectionCard>

      {/* Pet Experience */}
      <SectionCard isComplete={completionData?.completionStatus?.pet_experience}>
        <h2>
          <span className='icon'>
            {completionData?.completionStatus?.pet_experience ? '✓' : '3'}
          </span>
          Pet Experience
        </h2>
        <p>Share your experience with pets</p>

        <FormGrid>
          <FormGroup>
            <label htmlFor='experienceLevel'>Experience Level</label>
            <select
              id='experienceLevel'
              value={formData.petExperience?.experienceLevel || 'beginner'}
              onChange={e => handleInputChange('experienceLevel', e.target.value, 'petExperience')}
            >
              <option value='beginner'>First-time pet owner</option>
              <option value='some'>Some experience</option>
              <option value='experienced'>Very experienced</option>
            </select>
          </FormGroup>
          <FormGroup>
            <label htmlFor='hoursAloneDaily'>Hours Alone Daily</label>
            <input
              id='hoursAloneDaily'
              type='number'
              min='0'
              max='24'
              value={formData.petExperience?.hoursAloneDaily || 0}
              onChange={e =>
                handleInputChange('hoursAloneDaily', parseInt(e.target.value), 'petExperience')
              }
            />
          </FormGroup>
        </FormGrid>

        <CheckboxGroup>
          <input
            id='hasPetsCurrently'
            type='checkbox'
            checked={formData.petExperience?.hasPetsCurrently || false}
            onChange={e => handleInputChange('hasPetsCurrently', e.target.checked, 'petExperience')}
          />
          <label htmlFor='hasPetsCurrently'>I currently have pets</label>
        </CheckboxGroup>

        <CheckboxGroup>
          <input
            id='willingToTrain'
            type='checkbox'
            checked={formData.petExperience?.willingToTrain || false}
            onChange={e => handleInputChange('willingToTrain', e.target.checked, 'petExperience')}
          />
          <label htmlFor='willingToTrain'>I&apos;m willing to provide training</label>
        </CheckboxGroup>

        <FormGroup>
          <label htmlFor='previousPets'>Previous Pet Experience (optional)</label>
          <textarea
            id='previousPets'
            value={
              formData.petExperience?.previousPets
                ?.map(p => `${p.type} - ${p.whatHappened}`)
                .join('\n') || ''
            }
            onChange={e => {
              // Simple text field for now
              const text = e.target.value;
              handleInputChange('exercisePlans', text, 'petExperience');
            }}
            placeholder='Tell us about your experience with pets'
          />
        </FormGroup>

        <FormGroup>
          <label htmlFor='exercisePlans'>Exercise Plans</label>
          <textarea
            id='exercisePlans'
            value={formData.petExperience?.exercisePlans || ''}
            onChange={e => handleInputChange('exercisePlans', e.target.value, 'petExperience')}
            placeholder='How will you ensure your pet gets enough exercise?'
          />
        </FormGroup>
      </SectionCard>

      {/* References */}
      <SectionCard isComplete={completionData?.completionStatus?.references}>
        <h2>
          <span className='icon'>{completionData?.completionStatus?.references ? '✓' : '4'}</span>
          Personal References
        </h2>
        <p>Provide at least 2 personal references</p>

        {formData.references?.personal?.map((reference, index) => (
          <ReferenceItem key={index}>
            <h4>Reference {index + 1}</h4>
            <FormGrid>
              <FormGroup>
                <label htmlFor={`reference-${index}-name`}>Name</label>
                <input
                  id={`reference-${index}-name`}
                  type='text'
                  value={reference.name}
                  onChange={e => handleUpdateReference(index, 'name', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor={`reference-${index}-relationship`}>Relationship</label>
                <input
                  id={`reference-${index}-relationship`}
                  type='text'
                  value={reference.relationship}
                  onChange={e => handleUpdateReference(index, 'relationship', e.target.value)}
                  placeholder='e.g. Friend, Colleague, Neighbor'
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor={`reference-${index}-phone`}>Phone</label>
                <input
                  id={`reference-${index}-phone`}
                  type='tel'
                  value={reference.phone}
                  onChange={e => handleUpdateReference(index, 'phone', e.target.value)}
                  placeholder='07123 456789'
                  required
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor={`reference-${index}-email`}>Email (optional)</label>
                <input
                  id={`reference-${index}-email`}
                  type='email'
                  value={reference.email || ''}
                  onChange={e => handleUpdateReference(index, 'email', e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor={`reference-${index}-yearsKnown`}>Years Known</label>
                <input
                  id={`reference-${index}-yearsKnown`}
                  type='number'
                  min='0'
                  value={reference.yearsKnown}
                  onChange={e => handleUpdateReference(index, 'yearsKnown', e.target.value)}
                  required
                />
              </FormGroup>
            </FormGrid>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleRemoveReference(index)}
              style={{ marginTop: '1rem' }}
            >
              Remove Reference
            </Button>
          </ReferenceItem>
        ))}

        <Button variant='outline' onClick={handleAddReference} style={{ marginTop: '1rem' }}>
          Add Reference
        </Button>
      </SectionCard>

      <ActionButtons>
        <Button variant='outline' onClick={handleContinueAnyway} disabled={isSaving}>
          Continue Anyway
        </Button>
        <Button onClick={handleSave} disabled={isSaving} style={{ minWidth: '150px' }}>
          {isSaving ? <Spinner size='sm' /> : 'Save Profile'}
        </Button>
      </ActionButtons>
    </Container>
  );
};
