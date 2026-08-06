import clsx from 'clsx';

import * as styles from './Stepper.css';

export type StepperOrientation = 'horizontal' | 'vertical';

export type StepperStep = {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
};

export type StepperProps = {
  steps: StepperStep[];
  activeStep: number;
  completedSteps?: number[];
  onStepClick?: (index: number) => void;
  isStepDisabled?: (index: number) => boolean;
  orientation?: StepperOrientation;
  className?: string;
  'data-testid'?: string;
};

type StepStatus = 'complete' | 'current' | 'upcoming';

const STATUS_LABEL: Record<StepStatus, string> = {
  complete: 'Completed',
  current: 'Current',
  upcoming: 'Upcoming',
};

const resolveStatus = (
  index: number,
  activeStep: number,
  completedSteps: number[] | undefined
): StepStatus => {
  if (index === activeStep) {
    return 'current';
  }
  const isComplete = completedSteps ? completedSteps.includes(index) : index < activeStep;
  return isComplete ? 'complete' : 'upcoming';
};

const CheckIcon = () => (
  <svg className={styles.checkIcon} viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M16.704 5.29a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z'
    />
  </svg>
);

export const Stepper = ({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
  isStepDisabled,
  orientation = 'horizontal',
  className,
  'data-testid': testId,
}: StepperProps) => {
  const activeStepData = steps[activeStep];
  const announcement = activeStepData
    ? `Step ${activeStep + 1} of ${steps.length}: ${activeStepData.title}`
    : '';

  return (
    <div className={clsx(styles.root, className)} data-testid={testId}>
      <ol className={styles.list({ orientation })} data-orientation={orientation}>
        {steps.map((step, index) => {
          const status = resolveStatus(index, activeStep, completedSteps);
          const isCurrent = status === 'current';
          const disabled = isStepDisabled?.(index) ?? false;
          const clickable = Boolean(onStepClick) && !disabled;
          const prevComplete =
            index > 0 && resolveStatus(index - 1, activeStep, completedSteps) === 'complete';

          const content = (
            <>
              <span className={styles.marker({ status })} aria-hidden='true'>
                {status === 'complete' ? <CheckIcon /> : index + 1}
              </span>
              <span className={styles.body}>
                <span className={styles.title({ status })}>{step.title}</span>
                {step.description && <span className={styles.description}>{step.description}</span>}
                {step.optional && <span className={styles.optional}>Optional</span>}
                <span className={styles.visuallyHidden}>{STATUS_LABEL[status]}</span>
              </span>
            </>
          );

          return (
            <li key={step.id} className={styles.step({ orientation })}>
              {index > 0 && (
                <span className={styles.connector({ complete: prevComplete })} aria-hidden='true' />
              )}
              {clickable ? (
                <button
                  type='button'
                  className={styles.control({ clickable: true })}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => onStepClick?.(index)}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={styles.control({ clickable: false })}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className={styles.visuallyHidden} role='status' aria-live='polite'>
        {announcement}
      </div>
    </div>
  );
};
