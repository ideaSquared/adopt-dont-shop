import '@testing-library/jest-dom';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { Stepper, type StepperStep } from './Stepper';
import { useStepper } from './useStepper';

const steps: StepperStep[] = [
  { id: 'account', title: 'Account' },
  { id: 'home', title: 'Your home' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

describe('Stepper', () => {
  it('renders every step title', () => {
    render(<Stepper steps={steps} activeStep={1} />);

    steps.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    });
  });

  it('renders steps as an ordered list of list items', () => {
    render(<Stepper steps={steps} activeStep={0} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(steps.length);
  });

  it('marks only the active step with aria-current="step"', () => {
    render(<Stepper steps={steps} activeStep={1} />);

    const activeControl = screen.getByText('Your home').closest('[aria-current]');
    expect(activeControl).toHaveAttribute('aria-current', 'step');

    expect(screen.getByText('Account').closest('[aria-current]')).toBeNull();
    expect(screen.getByText('Review').closest('[aria-current]')).toBeNull();
  });

  it('shows a check for completed steps and a number for the current and upcoming steps', () => {
    render(<Stepper steps={steps} activeStep={2} />);

    const completed = screen.getByText('Account').closest('li');
    expect(completed?.querySelector('svg')).toBeInTheDocument();
    expect(completed).toHaveTextContent('Completed');

    const current = screen.getByText('Review').closest('li');
    expect(current?.querySelector('svg')).toBeNull();
    expect(current).toHaveTextContent('3');
    expect(current).toHaveTextContent('Current');

    const upcoming = screen.getByText('Done').closest('li');
    expect(upcoming?.querySelector('svg')).toBeNull();
    expect(upcoming).toHaveTextContent('4');
    expect(upcoming).toHaveTextContent('Upcoming');
  });

  it('uses completedSteps to determine completion when provided', () => {
    render(<Stepper steps={steps} activeStep={0} completedSteps={[2]} />);

    const explicitlyComplete = screen.getByText('Review').closest('li');
    expect(explicitlyComplete?.querySelector('svg')).toBeInTheDocument();

    // The step before the active one is NOT completed because completedSteps
    // overrides the index-based derivation.
    const notComplete = screen.getByText('Your home').closest('li');
    expect(notComplete?.querySelector('svg')).toBeNull();
  });

  it('renders steps as non-interactive when no onStepClick is provided', () => {
    render(<Stepper steps={steps} activeStep={1} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onStepClick with the step index when a clickable step is clicked', () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} activeStep={2} onStepClick={onStepClick} />);

    fireEvent.click(screen.getByRole('button', { name: /Account/ }));

    expect(onStepClick).toHaveBeenCalledTimes(1);
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('does not render disabled steps as buttons and they stay non-interactive', () => {
    const onStepClick = vi.fn();
    const isStepDisabled = (index: number) => index === 3;

    render(
      <Stepper
        steps={steps}
        activeStep={1}
        onStepClick={onStepClick}
        isStepDisabled={isStepDisabled}
      />
    );

    expect(screen.getByRole('button', { name: /Account/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Done/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Done'));
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it('announces the active step in a polite live region', () => {
    render(<Stepper steps={steps} activeStep={1} />);

    const liveRegion = screen.getByText('Step 2 of 4: Your home');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('renders step descriptions when provided', () => {
    const withDescription: StepperStep[] = [
      { id: 'account', title: 'Account', description: 'Your login details' },
      { id: 'home', title: 'Your home' },
    ];

    render(<Stepper steps={withDescription} activeStep={0} />);

    expect(screen.getByText('Your login details')).toBeInTheDocument();
  });

  it('marks optional steps', () => {
    const withOptional: StepperStep[] = [
      { id: 'account', title: 'Account' },
      { id: 'extras', title: 'Extras', optional: true },
    ];

    render(<Stepper steps={withOptional} activeStep={0} />);

    const optionalItem = screen.getByText('Extras').closest('li');
    expect(optionalItem).toHaveTextContent('Optional');
  });

  it('reflects the orientation on the list', () => {
    const { rerender } = render(<Stepper steps={steps} activeStep={0} />);
    expect(screen.getByRole('list')).toHaveAttribute('data-orientation', 'horizontal');

    rerender(<Stepper steps={steps} activeStep={0} orientation='vertical' />);
    expect(screen.getByRole('list')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('applies a custom className and data-testid', () => {
    render(
      <Stepper steps={steps} activeStep={0} className='custom-stepper' data-testid='stepper' />
    );

    expect(screen.getByTestId('stepper')).toHaveClass('custom-stepper');
  });
});

describe('useStepper', () => {
  it('starts at the first step by default', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    expect(result.current.activeStep).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it('honours the initial step', () => {
    const { result } = renderHook(() => useStepper({ steps, initialStep: 1 }));

    expect(result.current.activeStep).toBe(1);
    expect(result.current.isFirst).toBe(false);
  });

  it('advances with next', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.next());

    expect(result.current.activeStep).toBe(1);
  });

  it('does not advance past the last step', () => {
    const { result } = renderHook(() => useStepper({ steps, initialStep: 3 }));

    expect(result.current.isLast).toBe(true);

    act(() => result.current.next());

    expect(result.current.activeStep).toBe(3);
  });

  it('moves back with back', () => {
    const { result } = renderHook(() => useStepper({ steps, initialStep: 2 }));

    act(() => result.current.back());

    expect(result.current.activeStep).toBe(1);
  });

  it('does not move before the first step', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.back());

    expect(result.current.activeStep).toBe(0);
  });

  it('jumps to a step with goTo', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.goTo(2));

    expect(result.current.activeStep).toBe(2);
  });

  it('clamps out-of-range goTo targets', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.goTo(99));
    expect(result.current.activeStep).toBe(3);

    act(() => result.current.goTo(-5));
    expect(result.current.activeStep).toBe(0);
  });

  it('does not advance when the next guard is false', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.next(false));

    expect(result.current.activeStep).toBe(0);
  });

  it('advances when the next guard is explicitly true', () => {
    const { result } = renderHook(() => useStepper({ steps }));

    act(() => result.current.next(true));

    expect(result.current.activeStep).toBe(1);
  });

  it('calls onStepChange only when the active step actually changes', () => {
    const onStepChange = vi.fn();
    const { result } = renderHook(() => useStepper({ steps, onStepChange }));

    act(() => result.current.next());
    expect(onStepChange).toHaveBeenCalledWith(1);

    onStepChange.mockClear();

    act(() => result.current.back());
    act(() => result.current.back());

    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(0);
  });
});
