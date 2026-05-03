import { ApplicationData, Pet } from '@/services';
import React from 'react';
import * as styles from './ReviewStep.css';

interface ReviewStepProps {
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onComplete: (data: ApplicationData['additionalInfo']) => void;
  isUpdate: boolean;
}

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
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Review & Submit</h2>
      <p className={styles.stepDescription}>
        Please review your application details before submitting.
      </p>

      <form
        className={styles.form}
        id='step-6-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        {pet && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>Pet Information</h3>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Pet Name:</span>
              <span className={styles.reviewValue}>{pet.name}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Type:</span>
              <span className={styles.reviewValue}>{pet.type}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Breed:</span>
              <span className={styles.reviewValue}>{pet.breed}</span>
            </div>
          </div>
        )}

        {data.personalInfo && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>Personal Information</h3>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Name:</span>
              <span className={styles.reviewValue}>
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Email:</span>
              <span className={styles.reviewValue}>{data.personalInfo.email}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Phone:</span>
              <span className={styles.reviewValue}>{data.personalInfo.phone}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Address:</span>
              <span className={styles.reviewValue}>{data.personalInfo.address}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>City:</span>
              <span className={styles.reviewValue}>{data.personalInfo.city}</span>
            </div>
            {data.personalInfo.county && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>County:</span>
                <span className={styles.reviewValue}>{data.personalInfo.county}</span>
              </div>
            )}
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Postcode:</span>
              <span className={styles.reviewValue}>{data.personalInfo.postcode}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Country:</span>
              <span className={styles.reviewValue}>{data.personalInfo.country}</span>
            </div>
            {data.personalInfo.dateOfBirth && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Date of Birth:</span>
                <span className={styles.reviewValue}>{data.personalInfo.dateOfBirth}</span>
              </div>
            )}
            {data.personalInfo.occupation && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Occupation:</span>
                <span className={styles.reviewValue}>{data.personalInfo.occupation}</span>
              </div>
            )}
          </div>
        )}

        {data.livingsituation && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>Living Situation</h3>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Housing Type:</span>
              <span className={styles.reviewValue}>{data.livingsituation.housingType}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Owned/Rented:</span>
              <span className={styles.reviewValue}>
                {data.livingsituation.isOwned ? 'Owned' : 'Rented'}
              </span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Has Yard:</span>
              <span className={styles.reviewValue}>
                {data.livingsituation.hasYard ? 'Yes' : 'No'}
              </span>
            </div>
            {data.livingsituation.hasYard && data.livingsituation.yardSize && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Yard Size:</span>
                <span className={styles.reviewValue}>{data.livingsituation.yardSize}</span>
              </div>
            )}
            {data.livingsituation.hasYard && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Yard Fenced:</span>
                <span className={styles.reviewValue}>
                  {data.livingsituation.yardFenced ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Pets Allowed:</span>
              <span className={styles.reviewValue}>
                {data.livingsituation.allowsPets ? 'Yes' : 'No'}
              </span>
            </div>
            {data.livingsituation.landlordContact && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Landlord Contact:</span>
                <span className={styles.reviewValue}>{data.livingsituation.landlordContact}</span>
              </div>
            )}
            {data.livingsituation.householdSize && (
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Household Size:</span>
                <span className={styles.reviewValue}>
                  {data.livingsituation.householdSize} people
                </span>
              </div>
            )}
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Allergies in Household:</span>
              <span className={styles.reviewValue}>
                {data.livingsituation.hasAllergies ? 'Yes' : 'No'}
              </span>
            </div>
            {data.livingsituation.hasAllergies && data.livingsituation.allergyDetails && (
              <div className={styles.longTextReviewItem}>
                <span className={styles.reviewLabel}>Allergy Details:</span>
                <div className={styles.longTextValue}>{data.livingsituation.allergyDetails}</div>
              </div>
            )}
          </div>
        )}

        {data.petExperience && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>Pet Experience</h3>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Currently Have Pets:</span>
              <span className={styles.reviewValue}>
                {data.petExperience.hasPetsCurrently ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Experience Level:</span>
              <span className={styles.reviewValue}>{data.petExperience.experienceLevel}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Willing to Train:</span>
              <span className={styles.reviewValue}>
                {data.petExperience.willingToTrain ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Hours Alone Daily:</span>
              <span className={styles.reviewValue}>{data.petExperience.hoursAloneDaily} hours</span>
            </div>
            {data.petExperience.exercisePlans && (
              <div className={styles.longTextReviewItem}>
                <span className={styles.reviewLabel}>Exercise Plans:</span>
                <div className={styles.longTextValue}>{data.petExperience.exercisePlans}</div>
              </div>
            )}
            {data.petExperience.currentPets && data.petExperience.currentPets.length > 0 && (
              <>
                <span
                  className={styles.reviewLabel}
                  style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'block' }}
                >
                  Current Pets:
                </span>
                {data.petExperience.currentPets.map((pet, index) => (
                  <div className={styles.reviewItem} key={index}>
                    <span className={styles.reviewLabel}>
                      {pet.type} - {pet.breed}:
                    </span>
                    <span className={styles.reviewValue}>
                      Age {pet.age},{' '}
                      {pet.spayedNeutered ? 'Spayed/Neutered' : 'Not Spayed/Neutered'}
                    </span>
                  </div>
                ))}
              </>
            )}
            {data.petExperience.previousPets && data.petExperience.previousPets.length > 0 && (
              <>
                <span
                  className={styles.reviewLabel}
                  style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'block' }}
                >
                  Previous Pets:
                </span>
                {data.petExperience.previousPets.map((pet, index) => (
                  <div className={styles.reviewItem} key={index}>
                    <span className={styles.reviewLabel}>
                      {pet.type} - {pet.breed}:
                    </span>
                    <span className={styles.reviewValue}>
                      Owned for {pet.yearsOwned} years - {pet.whatHappened}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {data.references && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>References</h3>
            {data.references.veterinarian && (
              <>
                <span
                  className={styles.reviewLabel}
                  style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 'bold' }}
                >
                  Veterinarian Reference:
                </span>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Name:</span>
                  <span className={styles.reviewValue}>{data.references.veterinarian.name}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Clinic:</span>
                  <span className={styles.reviewValue}>
                    {data.references.veterinarian.clinicName}
                  </span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Phone:</span>
                  <span className={styles.reviewValue}>{data.references.veterinarian.phone}</span>
                </div>
                {data.references.veterinarian.email && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Email:</span>
                    <span className={styles.reviewValue}>{data.references.veterinarian.email}</span>
                  </div>
                )}
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Years Used:</span>
                  <span className={styles.reviewValue}>
                    {data.references.veterinarian.yearsUsed} years
                  </span>
                </div>
              </>
            )}
            {data.references.personal && data.references.personal.length > 0 && (
              <>
                <span
                  className={styles.reviewLabel}
                  style={{
                    marginTop: '1rem',
                    marginBottom: '0.5rem',
                    display: 'block',
                    fontWeight: 'bold',
                  }}
                >
                  Personal References:
                </span>
                {data.references.personal.map((ref, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Name:</span>
                      <span className={styles.reviewValue}>{ref.name}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Relationship:</span>
                      <span className={styles.reviewValue}>{ref.relationship}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Phone:</span>
                      <span className={styles.reviewValue}>{ref.phone}</span>
                    </div>
                    {ref.email && (
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Email:</span>
                        <span className={styles.reviewValue}>{ref.email}</span>
                      </div>
                    )}
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Years Known:</span>
                      <span className={styles.reviewValue}>{ref.yearsKnown} years</span>
                    </div>
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
          </div>
        )}

        {!data.references && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>References</h3>
            <p style={{ fontStyle: 'italic', color: '#666' }}>
              No references provided. You may be contacted later for references if needed.
            </p>
          </div>
        )}

        {data.additionalInfo && (
          <div className={styles.reviewSection}>
            <h3 className={styles.sectionTitle}>Additional Information</h3>
            <div className={styles.longTextReviewItem}>
              <span className={styles.reviewLabel}>Why do you want to adopt a pet:</span>
              <div className={styles.longTextValue}>{data.additionalInfo.whyAdopt}</div>
            </div>
            <div className={styles.longTextReviewItem}>
              <span className={styles.reviewLabel}>Pet ownership expectations:</span>
              <div className={styles.longTextValue}>{data.additionalInfo.expectations}</div>
            </div>
            <div className={styles.longTextReviewItem}>
              <span className={styles.reviewLabel}>Emergency plan:</span>
              <div className={styles.longTextValue}>{data.additionalInfo.emergencyPlan}</div>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Agreement:</span>
              <span className={styles.reviewValue}>
                {data.additionalInfo.agreement ? 'Agreed to terms and conditions' : 'Not agreed'}
              </span>
            </div>
          </div>
        )}

        <div className={styles.reviewSection}>
          <h3 className={styles.sectionTitle}>Application Status</h3>
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
        </div>
      </form>
    </div>
  );
};
