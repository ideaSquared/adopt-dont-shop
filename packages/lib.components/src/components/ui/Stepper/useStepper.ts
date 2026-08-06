import { useCallback, useState } from 'react';

import type { StepperStep } from './Stepper';

export type UseStepperOptions = {
  steps: StepperStep[];
  initialStep?: number;
  onStepChange?: (index: number) => void;
};

export type UseStepperResult = {
  activeStep: number;
  isFirst: boolean;
  isLast: boolean;
  next: (canProceed?: boolean) => void;
  back: () => void;
  goTo: (index: number) => void;
};

const clampStep = (index: number, lastIndex: number): number => {
  if (index < 0) {
    return 0;
  }
  if (index > lastIndex) {
    return lastIndex;
  }
  return index;
};

export const useStepper = ({
  steps,
  initialStep = 0,
  onStepChange,
}: UseStepperOptions): UseStepperResult => {
  const lastIndex = Math.max(steps.length - 1, 0);
  const [activeStep, setActiveStep] = useState(() => clampStep(initialStep, lastIndex));

  const goTo = useCallback(
    (index: number) => {
      const target = clampStep(index, lastIndex);
      if (target === activeStep) {
        return;
      }
      setActiveStep(target);
      onStepChange?.(target);
    },
    [activeStep, lastIndex, onStepChange]
  );

  const next = useCallback(
    (canProceed = true) => {
      if (!canProceed) {
        return;
      }
      goTo(activeStep + 1);
    },
    [activeStep, goTo]
  );

  const back = useCallback(() => {
    goTo(activeStep - 1);
  }, [activeStep, goTo]);

  return {
    activeStep,
    isFirst: activeStep === 0,
    isLast: activeStep === lastIndex,
    next,
    back,
    goTo,
  };
};
