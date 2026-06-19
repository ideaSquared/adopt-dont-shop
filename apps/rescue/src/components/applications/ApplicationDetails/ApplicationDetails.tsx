import React from 'react';
import * as styles from '../ApplicationReview.css';

type ApplicationDetailsProps = {
  getData: (path: string) => unknown;
  getStr: (path: string) => string;
  getArr: (path: string) => unknown[];
};

type PreviousPet = {
  type?: string;
  breed?: string;
  years_owned?: string;
  what_happened?: string;
};

export const ApplicationDetails: React.FC<ApplicationDetailsProps> = ({
  getData,
  getStr,
  getArr,
}) => {
  const previousPets = getArr('answers.previous_pets') as PreviousPet[];

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Personal Information</h3>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Contact Details</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <span className={styles.fieldValue}>
                {getStr('personalInfo.firstName') || 'N/A'} {getStr('personalInfo.lastName') || ''}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <span className={styles.fieldValue}>{getStr('personalInfo.email') || 'N/A'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Phone</span>
              <span className={styles.fieldValue}>{getStr('personalInfo.phone') || 'N/A'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Address</span>
              <span className={styles.fieldValue}>
                {getStr('personalInfo.address') || 'N/A'}
                <br />
                {getStr('personalInfo.city') || 'N/A'}, {getStr('personalInfo.state') || 'N/A'}{' '}
                {getStr('personalInfo.zipCode') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date of Birth</span>
              <span className={styles.fieldValue}>
                {getStr('personalInfo.dateOfBirth')
                  ? new Date(getStr('personalInfo.dateOfBirth')).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Household</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Household Size</span>
              <span className={styles.fieldValue}>
                {getStr('livingConditions.householdSize') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Housing Type</span>
              <span className={styles.fieldValue}>
                {getStr('livingConditions.housingType') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Own/Rent</span>
              <span className={styles.fieldValue}>
                {getData('livingConditions.isOwned') ? 'Own' : 'Rent'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Has Yard</span>
              <span className={styles.fieldValue}>
                {getData('livingConditions.hasYard') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Has Allergies</span>
              <span className={styles.fieldValue}>
                {getData('livingConditions.hasAllergies') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Household Members</span>
              <span className={styles.fieldValue}>
                {getArr('answers.household_members').length || 0} members
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Pet Preferences & Experience</h3>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Experience & Preferences</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Experience Level</span>
              <span className={styles.fieldValue}>
                {getStr('petExperience.experienceLevel') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Willing to Train</span>
              <span className={styles.fieldValue}>
                {getData('petExperience.willingToTrain') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Hours Alone Daily</span>
              <span className={styles.fieldValue}>
                {getStr('petExperience.hoursAloneDaily') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Exercise Plans</span>
              <span className={styles.fieldValue}>
                {getStr('petExperience.exercisePlans') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Currently Has Pets</span>
              <span className={styles.fieldValue}>
                {getData('petExperience.hasPetsCurrently') ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>References</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Veterinarian</span>
              <span className={styles.fieldValue}>
                {getStr('references.veterinarian.name') || 'N/A'}
                {getStr('references.veterinarian.clinicName') &&
                  ` - ${getStr('references.veterinarian.clinicName')}`}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Vet Phone</span>
              <span className={styles.fieldValue}>
                {getStr('references.veterinarian.phone') || 'N/A'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Personal References</span>
              <span className={styles.fieldValue}>
                {getArr('references.personal').length || 0} provided
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Application Answers</h3>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Adoption Motivation</h4>
            <div className={styles.fieldVertical}>
              <span className={styles.fieldLabel}>Why Adopt</span>
              <div className={styles.fieldValueFullWidth}>
                {getStr('answers.why_adopt') || 'N/A'}
              </div>
            </div>
            <div className={styles.fieldVertical}>
              <span className={styles.fieldLabel}>Exercise Plan</span>
              <div className={styles.fieldValueFullWidth}>
                {getStr('answers.exercise_plan') || 'N/A'}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Home Details</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Yard Size</span>
              <span className={styles.fieldValue}>{getStr('answers.yard_size') || 'N/A'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Yard Fenced</span>
              <span className={styles.fieldValue}>
                {getData('answers.yard_fenced') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Hours Pet Alone</span>
              <span className={styles.fieldValue}>{getStr('answers.hours_alone') || 'N/A'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Current Pets</span>
              <span className={styles.fieldValue}>
                {getArr('answers.current_pets').length || 0} pets
              </span>
            </div>
          </div>
        </div>
      </div>

      {previousPets.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Previous Pet Experience</h3>
          <div className={styles.grid}>
            {previousPets.map((pet, index) => (
              <div key={`prev-pet-${index}`} className={styles.card}>
                <h4 className={styles.cardTitle}>Previous Pet #{index + 1}</h4>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Type</span>
                  <span className={styles.fieldValue}>{pet.type || 'N/A'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Breed</span>
                  <span className={styles.fieldValue}>{pet.breed || 'N/A'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Years Owned</span>
                  <span className={styles.fieldValue}>{pet.years_owned || 'N/A'}</span>
                </div>
                <div className={styles.fieldVertical}>
                  <span className={styles.fieldLabel}>What Happened</span>
                  <div className={styles.fieldValueFullWidth}>{pet.what_happened || 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
