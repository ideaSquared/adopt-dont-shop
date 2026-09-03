# Stepper

A presentational progress indicator for multi-step flows, paired with a `useStepper` hook that manages wizard state (next/back/go-to plus a validation gate). Use the two together, or drop the `Stepper` into any flow that already tracks its own active step.

## Usage

```tsx
import { Stepper, useStepper } from '@adopt-dont-shop/lib.components';

const steps = [
  { id: 'account', title: 'Account' },
  { id: 'home', title: 'Your home', description: 'Where the pet will live' },
  { id: 'review', title: 'Review', optional: true },
];

function AdoptionWizard() {
  const { activeStep, isFirst, isLast, next, back, goTo } = useStepper({ steps });
  const canContinue = useFormIsValid(activeStep);

  return (
    <>
      <Stepper steps={steps} activeStep={activeStep} onStepClick={goTo} />

      <StepBody step={activeStep} />

      <button type='button' onClick={back} disabled={isFirst}>
        Back
      </button>
      <button type='button' onClick={() => next(canContinue)}>
        {isLast ? 'Submit' : 'Continue'}
      </button>
    </>
  );
}
```

## Stepper Props

| Prop             | Type                         | Default        | Description                                                                      |
| ---------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `steps`          | `StepperStep[]`              | -              | The ordered steps to render (required)                                           |
| `activeStep`     | `number`                     | -              | 0-based index of the current step (required)                                     |
| `completedSteps` | `number[]`                   | -              | Indices to mark complete; when omitted, any step before `activeStep` is complete |
| `onStepClick`    | `(index: number) => void`    | -              | When provided, non-disabled steps render as buttons and call this on click       |
| `isStepDisabled` | `(index: number) => boolean` | -              | Returns `true` for steps that must not be interactive                            |
| `orientation`    | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction                                                                 |
| `className`      | `string`                     | -              | Extra class applied to the root element                                          |
| `data-testid`    | `string`                     | -              | Test id applied to the root element                                              |

## StepperStep

```tsx
type StepperStep = {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
};
```

## useStepper

```tsx
const stepper = useStepper({ steps, initialStep, onStepChange });
```

### Options

| Option         | Type                      | Default | Description                                       |
| -------------- | ------------------------- | ------- | ------------------------------------------------- |
| `steps`        | `StepperStep[]`           | -       | The steps the wizard moves through (required)     |
| `initialStep`  | `number`                  | `0`     | Starting index (clamped to the valid range)       |
| `onStepChange` | `(index: number) => void` | -       | Called only when the active step actually changes |

### Returns

| Field        | Type                             | Description                                                        |
| ------------ | -------------------------------- | ------------------------------------------------------------------ |
| `activeStep` | `number`                         | Current 0-based step index                                         |
| `isFirst`    | `boolean`                        | Whether the current step is the first                              |
| `isLast`     | `boolean`                        | Whether the current step is the last                               |
| `next`       | `(canProceed?: boolean) => void` | Advances one step; passing `false` blocks it (the validation gate) |
| `back`       | `() => void`                     | Moves back one step (never before the first)                       |
| `goTo`       | `(index: number) => void`        | Jumps to a step; out-of-range indices are clamped                  |

## Features

- **Presentational + stateful split**: `Stepper` draws the progress; `useStepper` owns the flow state.
- **Validation gating**: `next(canProceed)` refuses to advance when `canProceed === false`.
- **Selective interactivity**: steps become buttons only when `onStepClick` is set and the step is not disabled.
- **Completion, two ways**: derive completion from `activeStep`, or drive it explicitly with `completedSteps`.
- **Orientation**: horizontal or vertical layouts.

## Examples

### Clickable steps with disabled gating

```tsx
<Stepper
  steps={steps}
  activeStep={activeStep}
  onStepClick={goTo}
  isStepDisabled={index => index > furthestReached}
/>
```

### Explicit completion

```tsx
<Stepper steps={steps} activeStep={1} completedSteps={[0, 2]} />
```

### Vertical layout

```tsx
<Stepper steps={steps} activeStep={activeStep} orientation='vertical' />
```

### Blocking advance until the current step is valid

```tsx
<button type='button' onClick={() => next(form.isValid)}>
  Continue
</button>
```

## Accessibility

- Steps are rendered as an ordered list (`<ol>` / `<li>`) so assistive tech announces position and count.
- The active step carries `aria-current="step"`.
- A visually-hidden `role="status"` / `aria-live="polite"` region announces the active step, e.g. "Step 2 of 4: Your home".
- Each step exposes a visually-hidden status label (Completed / Current / Upcoming), and completed steps show a check icon that is hidden from screen readers.
- Interactive steps are real `<button>` elements, so they are fully keyboard operable; disabled steps are not rendered as buttons at all.
