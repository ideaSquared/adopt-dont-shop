import { Button } from '@adopt-dont-shop/lib.components';
import React from 'react';
import * as styles from './ProfileCompletionPrompt.css';

interface ProfileCompletionPromptProps {
  completionPercentage: number;
  missingFields: string[];
  onCompleteProfile: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

const formatFieldName = (field: string): string => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export const ProfileCompletionPrompt: React.FC<ProfileCompletionPromptProps> = ({
  completionPercentage,
  missingFields,
  onCompleteProfile,
  onSkip,
  onDismiss,
}) => {
  // Only show if profile is incomplete (less than 90%)
  if (completionPercentage >= 90) {
    return null;
  }

  const displayFields = missingFields.slice(0, 5); // Show max 5 fields
  const hasMoreFields = missingFields.length > 5;

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptHeader}>
        <div className={styles.promptHeaderLeft}>
          <span className={styles.promptHeaderIcon}>🎯</span>
          <h3 className={styles.promptHeaderTitle}>Complete Your Profile</h3>
        </div>
        <button className={styles.dismissButton} onClick={onDismiss} aria-label='Dismiss'>
          ×
        </button>
      </div>

      <div className={styles.promptContent}>
        <p className={styles.promptContentP}>
          Complete your profile to unlock quick applications and improve your chances of adoption
          approval.
        </p>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${completionPercentage}%` }} />
          </div>
          <div className={styles.progressText}>{completionPercentage}% complete</div>
        </div>

        {displayFields.length > 0 && (
          <div className={styles.missingFields}>
            <h4 className={styles.missingFieldsTitle}>Missing Information:</h4>
            <div className={styles.fieldList}>
              {displayFields.map(field => (
                <span key={field} className={styles.fieldTag}>
                  {formatFieldName(field)}
                </span>
              ))}
              {hasMoreFields && (
                <span className={styles.fieldTag}>+{missingFields.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        <div className={styles.benefits}>
          <div className={styles.benefitItem}>
            <span className={styles.benefitIcon}>⚡</span>
            <span className={styles.benefitText}>
              Enable quick applications for future adoptions
            </span>
          </div>
          <div className={styles.benefitItem}>
            <span className={styles.benefitIcon}>📈</span>
            <span className={styles.benefitText}>Increase your application approval rate</span>
          </div>
          <div className={styles.benefitItem}>
            <span className={styles.benefitIcon}>💾</span>
            <span className={styles.benefitText}>Save time with pre-filled forms</span>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Button className={styles.completeButton} onClick={onCompleteProfile}>
            Complete Profile ({100 - completionPercentage}% remaining)
          </Button>
          <Button className={styles.skipButton} onClick={onSkip}>
            Skip for Now
          </Button>
        </div>
      </div>
    </div>
  );
};
