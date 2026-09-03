# <ComponentName>

One line: what this component renders and when to reach for it. Model this file
on [`QueryBoundary`](../../packages/lib.components/src/components/data/QueryBoundary/README.md)
and [`DateRangePicker`](../../packages/lib.components/src/components/form/DateRangePicker/README.md).

<!--
If the component is NOT exported from packages/lib.components/src/index.ts, open
with this banner instead of a Usage import:

> Not exported from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.
-->

## Usage

Import exported components from the package root — never a deep `src/…` path or
an app alias:

```tsx
import { <ComponentName> } from '@adopt-dont-shop/lib.components';

<<ComponentName> /* required props */ />;
```

## Props

Enumerate the props from the component's `.tsx` source. Mark required props and
give the real default for optional ones; never invent a prop.

| Prop      | Type         | Required | Default | Description                   |
| --------- | ------------ | -------- | ------- | ----------------------------- |
| `example` | `string`     | Yes      | —       | What it controls.             |
| `variant` | `'a' \| 'b'` | No       | `'a'`   | Optional prop with a default. |

## Accessibility

State the roles, labelling, and keyboard behaviour the component provides, and
anything the caller must supply (an accessible name, a label association, focus
management). If the component delegates a11y to a wrapped primitive, say which.

<!-- Optional. Add only when a second scenario is genuinely instructive. -->

## Examples
