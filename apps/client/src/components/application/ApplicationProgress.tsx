import React from 'react';
import { Stepper, type StepperStep } from '@adopt-dont-shop/lib.components';
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

/**
 * ADS-C1: adopts the shared `Stepper` for the guided application flow so the
 * onboarding and application wizards share one progress/step UI. The 1-based
 * `currentStep`/`onStepClick` contract is preserved for `ApplicationPage`;
 * only steps the user has already completed are interactive.
 */
export const ApplicationProgress: React.FC<ApplicationProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const stepperSteps: StepperStep[] = steps.map(step => ({
    id: String(step.id),
    title: step.title,
    description: step.description,
  }));

  return (
    <Stepper
      steps={stepperSteps}
      activeStep={currentStep - 1}
      onStepClick={index => onStepClick(index + 1)}
      isStepDisabled={index => index + 1 >= currentStep}
      className={styles.progressContainer}
      data-testid='application-stepper'
    />
  );
};
