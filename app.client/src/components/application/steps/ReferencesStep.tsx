import { ApplicationData } from '@/types';
import React from 'react';
import * as styles from './ReferencesStep.css';

interface ReferencesStepProps {
  data: Partial<ApplicationData['references']>;
  onComplete: (data: ApplicationData['references']) => void;
}

export const ReferencesStep: React.FC<ReferencesStepProps> = ({ onComplete }) => {
  const handleContinue = () => {
    onComplete({
      personal: [
        {
          name: 'Reference Name',
          relationship: 'Friend',
          phone: '555-0123',
          email: 'reference@example.com',
          yearsKnown: 5,
        },
      ],
    });
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>References</h2>
      <p className={styles.stepDescription}>
        Please provide contact information for references who can speak to your character and
        ability to care for a pet.
      </p>

      <form
        className={styles.form}
        id='step-4-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <div className={styles.placeholderText}>
          References form coming soon...
          <br />
          <small>This will include fields for veterinary and personal references.</small>
        </div>
      </form>
    </div>
  );
};
