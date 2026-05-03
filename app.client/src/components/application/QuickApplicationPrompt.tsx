import { Button } from '@adopt-dont-shop/lib.components';
import React from 'react';
import { QuickApplicationCapability } from '../../types';
import * as styles from './QuickApplicationPrompt.css';

interface QuickApplicationPromptProps {
  capability: QuickApplicationCapability;
  onQuickApply: () => void;
  onRegularApply: () => void;
  petName?: string;
}

export const QuickApplicationPrompt: React.FC<QuickApplicationPromptProps> = ({
  capability,
  onQuickApply,
  onRegularApply,
  petName = 'this pet',
}) => {
  if (!capability.canProceed) {
    return null;
  }

  const completionPercentage = Math.round(capability.completionPercentage || 0);

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptHeader}>
        <span className={styles.promptHeaderIcon}>⚡</span>
        <h3 className={styles.promptHeaderTitle}>Quick Application Available</h3>
      </div>

      <div className={styles.promptContent}>
        <p className={styles.promptContentP}>
          Great news! Your profile is {completionPercentage}% complete, so you can apply for{' '}
          {petName} with just a few clicks using your saved information.
        </p>

        <div className={styles.benefits}>
          <span className={styles.benefit}>✨ Pre-filled forms</span>
          <span className={styles.benefit}>⏱️ 2-minute application</span>
          <span className={styles.benefit}>🎯 Higher approval rate</span>
        </div>

        <div className={styles.buttonGroup}>
          <Button className={styles.quickApplyButton} onClick={onQuickApply}>
            Quick Apply (2 min)
          </Button>
          <Button className={styles.regularButton} variant='outline' onClick={onRegularApply}>
            Standard Application
          </Button>
        </div>
      </div>
    </div>
  );
};
