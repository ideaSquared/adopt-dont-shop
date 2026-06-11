# DateTime

Formats an ISO timestamp (or `Date`) for display with optional tooltip showing the absolute value. Source: `DateTime.tsx`.

```tsx
import { DateTime } from '@adopt-dont-shop/lib.components';

<DateTime timestamp={pet.createdAt} localeOption="en-GB" showTooltip />
```

## Props

| Prop           | Type                       | Required | Default   | Description                                  |
| -------------- | -------------------------- | -------- | --------- | -------------------------------------------- |
| `timestamp`    | `string \| Date`           | Yes      | —         | ISO string or `Date` to render.              |
| `localeOption` | `'en-GB' \| 'en-US'`       | No       | `'en-GB'` | Locale used by `Intl.DateTimeFormat`.        |
| `showTooltip`  | `boolean`                  | No       | `false`   | Show absolute timestamp on hover.            |
