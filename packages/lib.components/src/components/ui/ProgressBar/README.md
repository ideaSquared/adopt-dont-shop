# ProgressBar

A determinate or indeterminate progress bar with size and tone variants and an
optional label / value readout.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

## Usage

```tsx
import { ProgressBar } from './ProgressBar';

<ProgressBar value={step} max={totalSteps} label='Application progress' showPercentage />;
```

For an unknown duration, set `indeterminate`:

```tsx
<ProgressBar value={0} indeterminate label='Uploading' />
```

## Props

| Prop             | Type                                             | Required | Default     | Description                                    |
| ---------------- | ------------------------------------------------ | -------- | ----------- | ---------------------------------------------- |
| `value`          | `number`                                         | Yes      | —           | Current value (clamped to `0..max`).           |
| `max`            | `number`                                         | No       | `100`       | Maximum value.                                 |
| `size`           | `'sm' \| 'md' \| 'lg'`                           | No       | `'md'`      | Bar height.                                    |
| `variant`        | `'default' \| 'success' \| 'warning' \| 'error'` | No       | `'default'` | Tone.                                          |
| `label`          | `string`                                         | No       | —           | Visible label and part of the accessible name. |
| `showValue`      | `boolean`                                        | No       | `false`     | Show `value / max`.                            |
| `showPercentage` | `boolean`                                        | No       | `false`     | Show a percentage.                             |
| `animated`       | `boolean`                                        | No       | `false`     | Animate the fill.                              |
| `striped`        | `boolean`                                        | No       | `false`     | Striped fill.                                  |
| `indeterminate`  | `boolean`                                        | No       | `false`     | Unknown-progress mode (no `aria-valuenow`).    |
| `className`      | `string`                                         | No       | —           | Extra class.                                   |
| `data-testid`    | `string`                                         | No       | —           | Test id.                                       |

## Accessibility

Renders `role="progressbar"` with `aria-valuemin` / `aria-valuemax` and, when
determinate, `aria-valuenow`. The accessible name derives from `label`
(defaulting to "Progress"), so pass a meaningful `label`. In `indeterminate`
mode `aria-valuenow` is omitted and the name reflects the loading state.
