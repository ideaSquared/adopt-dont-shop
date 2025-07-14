import { ApplicationData } from '@/types';
import React, { useState } from 'react';
import styled from 'styled-components';

interface PetExperienceStepProps {
  data: Partial<ApplicationData['petExperience']>;
  onComplete: (data: ApplicationData['petExperience']) => void;
}

const StepContainer = styled.div`
  max-width: 600px;
`;

const StepTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.text.secondary};
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const FormSection = styled.div`
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 8px;
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;

  input[type='radio'] {
    margin-right: 0.5rem;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;

  input[type='checkbox'] {
    margin-right: 0.5rem;
  }
`;

const PetList = styled.div`
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
`;

const PetItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  display: grid;
  grid-template-columns: 1fr 1fr 80px 80px auto;
  gap: 1rem;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
`;

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
  }
`;

const RemoveButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: ${props => props.theme.colors.semantic.error[500]};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: ${props => props.theme.colors.semantic.error[600]};
  }
`;

const SliderGroup = styled.div`
  margin-top: 0.5rem;
`;

const SliderInput = styled.input`
  width: 100%;
  margin: 0.5rem 0;
`;

const SliderValue = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.primary[500]};
`;

export const PetExperienceStep: React.FC<PetExperienceStepProps> = ({ data, onComplete }) => {
  const [formData, setFormData] = useState<ApplicationData['petExperience']>({
    hasPetsCurrently: data.hasPetsCurrently ?? false,
    currentPets: data.currentPets ?? [],
    previousPets: data.previousPets ?? [],
    experienceLevel: data.experienceLevel ?? 'some',
    willingToTrain: data.willingToTrain ?? true,
    hoursAloneDaily: data.hoursAloneDaily ?? 4,
    exercisePlans: data.exercisePlans ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const addCurrentPet = () => {
    setFormData(prev => ({
      ...prev,
      currentPets: [
        ...(prev.currentPets || []),
        {
          type: '',
          breed: '',
          age: 1,
          spayedNeutered: false,
          vaccinated: false,
        },
      ],
    }));
  };

  const removeCurrentPet = (index: number) => {
    setFormData(prev => ({
      ...prev,
      currentPets: prev.currentPets?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateCurrentPet = (index: number, field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      currentPets:
        prev.currentPets?.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet)) || [],
    }));
  };

  const addPreviousPet = () => {
    setFormData(prev => ({
      ...prev,
      previousPets: [
        ...(prev.previousPets || []),
        {
          type: '',
          breed: '',
          yearsOwned: 1,
          whatHappened: '',
        },
      ],
    }));
  };

  const removePreviousPet = (index: number) => {
    setFormData(prev => ({
      ...prev,
      previousPets: prev.previousPets?.filter((_, i) => i !== index) || [],
    }));
  };

  const updatePreviousPet = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      previousPets:
        prev.previousPets?.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet)) || [],
    }));
  };

  return (
    <StepContainer>
      <StepTitle>Pet Experience</StepTitle>
      <StepDescription>
        Tell us about your experience with pets and how you plan to care for your new companion.
      </StepDescription>

      <Form id='step-3-form' onSubmit={handleSubmit}>
        {/* Current Pets Section */}
        <FormSection>
          <SectionTitle>Current Pets</SectionTitle>

          <FormGroup>
            <Label>Do you currently have any pets?</Label>
            <RadioGroup>
              <RadioOption>
                <input
                  type='radio'
                  name='hasPetsCurrently'
                  checked={formData.hasPetsCurrently === true}
                  onChange={() => setFormData(prev => ({ ...prev, hasPetsCurrently: true }))}
                />
                Yes
              </RadioOption>
              <RadioOption>
                <input
                  type='radio'
                  name='hasPetsCurrently'
                  checked={formData.hasPetsCurrently === false}
                  onChange={() => setFormData(prev => ({ ...prev, hasPetsCurrently: false }))}
                />
                No
              </RadioOption>
            </RadioGroup>
          </FormGroup>

          {formData.hasPetsCurrently && (
            <FormGroup>
              <Label>Current Pets Details</Label>
              {formData.currentPets && formData.currentPets.length > 0 && (
                <PetList>
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f5f5f5',
                      fontWeight: '500',
                      fontSize: '0.9rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 80px 80px auto',
                        gap: '1rem',
                      }}
                    >
                      <span>Type</span>
                      <span>Breed</span>
                      <span>Age</span>
                      <span>Fixed</span>
                      <span>Vax</span>
                    </div>
                  </div>
                  {formData.currentPets.map((pet, index) => (
                    <PetItem key={index}>
                      <Input
                        type='text'
                        value={pet.type}
                        onChange={e => updateCurrentPet(index, 'type', e.target.value)}
                        placeholder='Dog, Cat, etc.'
                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                      />
                      <Input
                        type='text'
                        value={pet.breed || ''}
                        onChange={e => updateCurrentPet(index, 'breed', e.target.value)}
                        placeholder='Breed'
                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                      />
                      <Input
                        type='number'
                        value={pet.age}
                        onChange={e =>
                          updateCurrentPet(index, 'age', parseInt(e.target.value) || 1)
                        }
                        min='0'
                        max='30'
                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                      />
                      <CheckboxLabel style={{ fontSize: '0.9rem' }}>
                        <input
                          type='checkbox'
                          checked={pet.spayedNeutered}
                          onChange={e =>
                            updateCurrentPet(index, 'spayedNeutered', e.target.checked)
                          }
                        />
                      </CheckboxLabel>
                      <CheckboxLabel style={{ fontSize: '0.9rem' }}>
                        <input
                          type='checkbox'
                          checked={pet.vaccinated}
                          onChange={e => updateCurrentPet(index, 'vaccinated', e.target.checked)}
                        />
                      </CheckboxLabel>
                      <RemoveButton type='button' onClick={() => removeCurrentPet(index)}>
                        Remove
                      </RemoveButton>
                    </PetItem>
                  ))}
                </PetList>
              )}
              <div style={{ marginTop: '1rem' }}>
                <AddButton type='button' onClick={addCurrentPet}>
                  Add Current Pet
                </AddButton>
              </div>
            </FormGroup>
          )}
        </FormSection>

        {/* Previous Pets Section */}
        <FormSection>
          <SectionTitle>Previous Pet Experience</SectionTitle>

          <FormGroup>
            <Label>Previous Pets (if any)</Label>
            {formData.previousPets && formData.previousPets.length > 0 && (
              <PetList>
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f5f5f5',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 100px 2fr auto',
                      gap: '1rem',
                    }}
                  >
                    <span>Type</span>
                    <span>Breed</span>
                    <span>Years Owned</span>
                    <span>What Happened</span>
                    <span></span>
                  </div>
                </div>
                {formData.previousPets.map((pet, index) => (
                  <PetItem key={index} style={{ gridTemplateColumns: '1fr 1fr 100px 2fr auto' }}>
                    <Input
                      type='text'
                      value={pet.type}
                      onChange={e => updatePreviousPet(index, 'type', e.target.value)}
                      placeholder='Dog, Cat, etc.'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='text'
                      value={pet.breed || ''}
                      onChange={e => updatePreviousPet(index, 'breed', e.target.value)}
                      placeholder='Breed'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='number'
                      value={pet.yearsOwned}
                      onChange={e =>
                        updatePreviousPet(index, 'yearsOwned', parseInt(e.target.value) || 1)
                      }
                      min='0'
                      max='30'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='text'
                      value={pet.whatHappened}
                      onChange={e => updatePreviousPet(index, 'whatHappened', e.target.value)}
                      placeholder='Passed away, rehomed, etc.'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <RemoveButton type='button' onClick={() => removePreviousPet(index)}>
                      Remove
                    </RemoveButton>
                  </PetItem>
                ))}
              </PetList>
            )}
            <div style={{ marginTop: '1rem' }}>
              <AddButton type='button' onClick={addPreviousPet}>
                Add Previous Pet
              </AddButton>
            </div>
          </FormGroup>
        </FormSection>

        {/* Experience Level Section */}
        <FormSection>
          <SectionTitle>Pet Care Experience</SectionTitle>

          <FormGroup>
            <Label>How would you describe your experience level with pets?</Label>
            <Select
              value={formData.experienceLevel}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  experienceLevel: e.target.value as 'beginner' | 'some' | 'experienced' | 'expert',
                }))
              }
            >
              <option value='beginner'>Beginner - Little to no experience</option>
              <option value='some'>Some Experience - Had pets before</option>
              <option value='experienced'>Experienced - Comfortable with pet care</option>
              <option value='expert'>
                Expert - Extensive experience or professional background
              </option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Are you willing to work with a pet that needs training?</Label>
            <RadioGroup>
              <RadioOption>
                <input
                  type='radio'
                  name='willingToTrain'
                  checked={formData.willingToTrain === true}
                  onChange={() => setFormData(prev => ({ ...prev, willingToTrain: true }))}
                />
                Yes, I&apos;m willing to invest time in training
              </RadioOption>
              <RadioOption>
                <input
                  type='radio'
                  name='willingToTrain'
                  checked={formData.willingToTrain === false}
                  onChange={() => setFormData(prev => ({ ...prev, willingToTrain: false }))}
                />
                No, I prefer a well-trained pet
              </RadioOption>
            </RadioGroup>
          </FormGroup>
        </FormSection>

        {/* Daily Care Section */}
        <FormSection>
          <SectionTitle>Daily Care Plans</SectionTitle>

          <FormGroup>
            <Label>
              How many hours per day will the pet be alone?
              <SliderValue> ({formData.hoursAloneDaily} hours)</SliderValue>
            </Label>
            <SliderGroup>
              <SliderInput
                type='range'
                min='0'
                max='12'
                value={formData.hoursAloneDaily}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    hoursAloneDaily: parseInt(e.target.value),
                  }))
                }
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: '#666',
                }}
              >
                <span>0 hours</span>
                <span>6 hours</span>
                <span>12+ hours</span>
              </div>
            </SliderGroup>
          </FormGroup>

          <FormGroup>
            <Label>Describe your exercise and activity plans for this pet</Label>
            <Textarea
              value={formData.exercisePlans}
              onChange={e => setFormData(prev => ({ ...prev, exercisePlans: e.target.value }))}
              placeholder='e.g., Daily walks in the morning and evening, weekend hikes, playtime in the yard, visits to dog parks...'
              required
            />
          </FormGroup>
        </FormSection>
      </Form>
    </StepContainer>
  );
};
