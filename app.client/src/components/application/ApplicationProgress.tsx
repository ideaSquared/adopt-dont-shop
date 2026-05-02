import React from 'react';
import clsx from 'clsx';
import * as styles from './ApplicationProgress.css';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ApplicationProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const ApplicationProgress: React.FC<ApplicationProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={styles.progressContainer}>
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <div
                className={clsx(
                  styles.stepItem,
                  isClickable ? styles.stepItemClickable : styles.stepItemDefault,
                  isActive && styles.stepItemActiveMobile
                )}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div
                  className={clsx(
                    styles.stepNumber,
                    isCompleted
                      ? styles.stepNumberVariants.completed
                      : isActive
                        ? styles.stepNumberVariants.active
                        : styles.stepNumberVariants.inactive
                  )}
                >
                  {isCompleted ? '✓' : step.id}
                </div>
                <div className={styles.stepContent}>
                  <h3
                    className={clsx(
                      styles.stepTitle,
                      isCompleted || isActive
                        ? styles.stepTitleVariants.activeOrCompleted
                        : styles.stepTitleVariants.inactive
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={clsx(
                      styles.stepDescription,
                      isCompleted || isActive
                        ? styles.stepDescriptionVariants.activeOrCompleted
                        : styles.stepDescriptionVariants.inactive
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    styles.stepConnector,
                    isCompleted
                      ? styles.stepConnectorVariants.completed
                      : styles.stepConnectorVariants.incomplete
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
      </div>
    </div>
  );
};
