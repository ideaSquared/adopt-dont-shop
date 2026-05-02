import { ApplicationData } from '@/services';
import React from 'react';
import * as styles from './PetExperienceStep.css';

interface PetExperienceStepProps {
  data: Partial<ApplicationData['petExperience']>;
  onComplete: (data: ApplicationData['petExperience']) => void;
}

export const PetExperienceStep: React.FC<PetExperienceStepProps> = ({ onComplete }) => {
  const handleContinue = () => {
    onComplete({
      hasPetsCurrently: false,
      experienceLevel: 'some',
      willingToTrain: true,
      hoursAloneDaily: 4,
      exercisePlans: 'Daily walks and playtime',
    });
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Pet Experience</h2>
      <p className={styles.stepDescription}>
        Tell us about your experience with pets and how you plan to care for your new companion.
      </p>

      <form
        className={styles.form}
        id='step-3-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <div className={styles.placeholderText}>
          Pet Experience form coming soon...
          <br />
          <small>
            This will include questions about current pets, previous experience, and care plans.
          </small>
        </div>
      </form>
    </div>
  );
};
