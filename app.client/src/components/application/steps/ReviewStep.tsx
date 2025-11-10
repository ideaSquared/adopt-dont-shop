import { ApplicationData, Pet } from '@/services';
import React from 'react';
import styled from 'styled-components';

interface ReviewStepProps {
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onComplete: (data: ApplicationData['additionalInfo']) => void;
  isUpdate: boolean;
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

const ReviewSection = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const ReviewItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const Label = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
  flex-shrink: 0;

  @media (min-width: 768px) {
    min-width: 200px;
    max-width: 200px;
  }
`;

const Value = styled.span`
  color: ${props => props.theme.text.primary};
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.4;

  @media (min-width: 768px) {
    flex: 1;
    text-align: right;
  }
`;

const LongTextReviewItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const LongTextValue = styled.div`
  color: ${props => props.theme.text.primary};
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
  padding: 0.75rem;
  background: ${props => props.theme.background.tertiary || props.theme.background.primary};
  border-radius: 4px;
  border: 1px solid
    ${props => props.theme.border.color.secondary || props.theme.border.color.primary};
`;

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, pet, onComplete, isUpdate }) => {
  const handleContinue = () => {
    onComplete({
      whyAdopt: 'I want to provide a loving home for a pet in need.',
      expectations: 'I expect to provide daily care, exercise, and companionship.',
      emergencyPlan: 'I have a local emergency vet and backup caregiver.',
      agreement: true,
    });
  };

  return (
    <StepContainer>
      <StepTitle>Review & Submit</StepTitle>
      <StepDescription>Please review your application details before submitting.</StepDescription>

      <Form
        id='step-6-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        {pet && (
          <ReviewSection>
            <SectionTitle>Pet Information</SectionTitle>
            <ReviewItem>
              <Label>Pet Name:</Label>
              <Value>{pet.name}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Type:</Label>
              <Value>{pet.type}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Breed:</Label>
              <Value>{pet.breed}</Value>
            </ReviewItem>
          </ReviewSection>
        )}

        {data.personalInfo && (
          <ReviewSection>
            <SectionTitle>Personal Information</SectionTitle>
            <ReviewItem>
              <Label>Name:</Label>
              <Value>
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Email:</Label>
              <Value>{data.personalInfo.email}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Phone:</Label>
              <Value>{data.personalInfo.phone}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Address:</Label>
              <Value>{data.personalInfo.address}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>City:</Label>
              <Value>{data.personalInfo.city}</Value>
            </ReviewItem>
            {data.personalInfo.county && (
              <ReviewItem>
                <Label>County:</Label>
                <Value>{data.personalInfo.county}</Value>
              </ReviewItem>
            )}
            <ReviewItem>
              <Label>Postcode:</Label>
              <Value>{data.personalInfo.postcode}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Country:</Label>
              <Value>{data.personalInfo.country}</Value>
            </ReviewItem>
            {data.personalInfo.dateOfBirth && (
              <ReviewItem>
                <Label>Date of Birth:</Label>
                <Value>{data.personalInfo.dateOfBirth}</Value>
              </ReviewItem>
            )}
            {data.personalInfo.occupation && (
              <ReviewItem>
                <Label>Occupation:</Label>
                <Value>{data.personalInfo.occupation}</Value>
              </ReviewItem>
            )}
          </ReviewSection>
        )}

        {data.livingsituation && (
          <ReviewSection>
            <SectionTitle>Living Situation</SectionTitle>
            <ReviewItem>
              <Label>Housing Type:</Label>
              <Value>{data.livingsituation.housingType}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Owned/Rented:</Label>
              <Value>{data.livingsituation.isOwned ? 'Owned' : 'Rented'}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Has Yard:</Label>
              <Value>{data.livingsituation.hasYard ? 'Yes' : 'No'}</Value>
            </ReviewItem>
            {data.livingsituation.hasYard && data.livingsituation.yardSize && (
              <ReviewItem>
                <Label>Yard Size:</Label>
                <Value>{data.livingsituation.yardSize}</Value>
              </ReviewItem>
            )}
            {data.livingsituation.hasYard && (
              <ReviewItem>
                <Label>Yard Fenced:</Label>
                <Value>{data.livingsituation.yardFenced ? 'Yes' : 'No'}</Value>
              </ReviewItem>
            )}
            <ReviewItem>
              <Label>Pets Allowed:</Label>
              <Value>{data.livingsituation.allowsPets ? 'Yes' : 'No'}</Value>
            </ReviewItem>
            {data.livingsituation.landlordContact && (
              <ReviewItem>
                <Label>Landlord Contact:</Label>
                <Value>{data.livingsituation.landlordContact}</Value>
              </ReviewItem>
            )}
            {data.livingsituation.householdSize && (
              <ReviewItem>
                <Label>Household Size:</Label>
                <Value>{data.livingsituation.householdSize} people</Value>
              </ReviewItem>
            )}
            <ReviewItem>
              <Label>Allergies in Household:</Label>
              <Value>{data.livingsituation.hasAllergies ? 'Yes' : 'No'}</Value>
            </ReviewItem>
            {data.livingsituation.hasAllergies && data.livingsituation.allergyDetails && (
              <LongTextReviewItem>
                <Label>Allergy Details:</Label>
                <LongTextValue>{data.livingsituation.allergyDetails}</LongTextValue>
              </LongTextReviewItem>
            )}
          </ReviewSection>
        )}

        {data.petExperience && (
          <ReviewSection>
            <SectionTitle>Pet Experience</SectionTitle>
            <ReviewItem>
              <Label>Currently Have Pets:</Label>
              <Value>{data.petExperience.hasPetsCurrently ? 'Yes' : 'No'}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Experience Level:</Label>
              <Value>{data.petExperience.experienceLevel}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Willing to Train:</Label>
              <Value>{data.petExperience.willingToTrain ? 'Yes' : 'No'}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Hours Alone Daily:</Label>
              <Value>{data.petExperience.hoursAloneDaily} hours</Value>
            </ReviewItem>
            {data.petExperience.exercisePlans && (
              <LongTextReviewItem>
                <Label>Exercise Plans:</Label>
                <LongTextValue>{data.petExperience.exercisePlans}</LongTextValue>
              </LongTextReviewItem>
            )}
            {data.petExperience.currentPets && data.petExperience.currentPets.length > 0 && (
              <>
                <Label style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'block' }}>
                  Current Pets:
                </Label>
                {data.petExperience.currentPets.map((pet, index) => (
                  <ReviewItem key={index}>
                    <Label>
                      {pet.type} - {pet.breed}:
                    </Label>
                    <Value>
                      Age {pet.age},{' '}
                      {pet.spayedNeutered ? 'Spayed/Neutered' : 'Not Spayed/Neutered'}
                    </Value>
                  </ReviewItem>
                ))}
              </>
            )}
            {data.petExperience.previousPets && data.petExperience.previousPets.length > 0 && (
              <>
                <Label style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'block' }}>
                  Previous Pets:
                </Label>
                {data.petExperience.previousPets.map((pet, index) => (
                  <ReviewItem key={index}>
                    <Label>
                      {pet.type} - {pet.breed}:
                    </Label>
                    <Value>
                      Owned for {pet.yearsOwned} years - {pet.whatHappened}
                    </Value>
                  </ReviewItem>
                ))}
              </>
            )}
          </ReviewSection>
        )}

        {data.references && (
          <ReviewSection>
            <SectionTitle>References</SectionTitle>
            {data.references.veterinarian && (
              <>
                <Label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 'bold' }}>
                  Veterinarian Reference:
                </Label>
                <ReviewItem>
                  <Label>Name:</Label>
                  <Value>{data.references.veterinarian.name}</Value>
                </ReviewItem>
                <ReviewItem>
                  <Label>Clinic:</Label>
                  <Value>{data.references.veterinarian.clinicName}</Value>
                </ReviewItem>
                <ReviewItem>
                  <Label>Phone:</Label>
                  <Value>{data.references.veterinarian.phone}</Value>
                </ReviewItem>
                {data.references.veterinarian.email && (
                  <ReviewItem>
                    <Label>Email:</Label>
                    <Value>{data.references.veterinarian.email}</Value>
                  </ReviewItem>
                )}
                <ReviewItem>
                  <Label>Years Used:</Label>
                  <Value>{data.references.veterinarian.yearsUsed} years</Value>
                </ReviewItem>
              </>
            )}
            {data.references.personal && data.references.personal.length > 0 && (
              <>
                <Label
                  style={{
                    marginTop: '1rem',
                    marginBottom: '0.5rem',
                    display: 'block',
                    fontWeight: 'bold',
                  }}
                >
                  Personal References:
                </Label>
                {data.references.personal.map((ref, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <ReviewItem>
                      <Label>Name:</Label>
                      <Value>{ref.name}</Value>
                    </ReviewItem>
                    <ReviewItem>
                      <Label>Relationship:</Label>
                      <Value>{ref.relationship}</Value>
                    </ReviewItem>
                    <ReviewItem>
                      <Label>Phone:</Label>
                      <Value>{ref.phone}</Value>
                    </ReviewItem>
                    {ref.email && (
                      <ReviewItem>
                        <Label>Email:</Label>
                        <Value>{ref.email}</Value>
                      </ReviewItem>
                    )}
                    <ReviewItem>
                      <Label>Years Known:</Label>
                      <Value>{ref.yearsKnown} years</Value>
                    </ReviewItem>
                  </div>
                ))}
              </>
            )}
            {!data.references.veterinarian &&
              (!data.references.personal || data.references.personal.length === 0) && (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No references provided. You may be contacted later for references if needed.
                </p>
              )}
          </ReviewSection>
        )}

        {!data.references && (
          <ReviewSection>
            <SectionTitle>References</SectionTitle>
            <p style={{ fontStyle: 'italic', color: '#666' }}>
              No references provided. You may be contacted later for references if needed.
            </p>
          </ReviewSection>
        )}

        {data.additionalInfo && (
          <ReviewSection>
            <SectionTitle>Additional Information</SectionTitle>
            <LongTextReviewItem>
              <Label>Why do you want to adopt a pet:</Label>
              <LongTextValue>{data.additionalInfo.whyAdopt}</LongTextValue>
            </LongTextReviewItem>
            <LongTextReviewItem>
              <Label>Pet ownership expectations:</Label>
              <LongTextValue>{data.additionalInfo.expectations}</LongTextValue>
            </LongTextReviewItem>
            <LongTextReviewItem>
              <Label>Emergency plan:</Label>
              <LongTextValue>{data.additionalInfo.emergencyPlan}</LongTextValue>
            </LongTextReviewItem>
            <ReviewItem>
              <Label>Agreement:</Label>
              <Value>
                {data.additionalInfo.agreement ? 'Agreed to terms and conditions' : 'Not agreed'}
              </Value>
            </ReviewItem>
          </ReviewSection>
        )}

        <ReviewSection>
          <SectionTitle>Application Status</SectionTitle>
          <p>
            {isUpdate
              ? 'You are updating an existing application.'
              : 'This is a new application submission.'}
          </p>
          <p>By submitting this application, you agree to our terms and conditions.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Please review all information above for accuracy. Once submitted, you may not be able to
            edit certain details.
          </p>
        </ReviewSection>
      </Form>
    </StepContainer>
  );
};
