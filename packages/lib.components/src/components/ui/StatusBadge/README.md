# StatusBadge

A `Badge` whose label and colour come from the shared status maps in
`@adopt-dont-shop/lib.types` (`getStatusDisplay`, `petStatusLabel`/`petStatusVariant`, and
the equivalents for application, rescue, user, support-ticket and report statuses). Use it
instead of per-page `getStatusBadge*` helpers and hand-rolled `badgeSuccess` styles.

```tsx
import { StatusBadge } from '@adopt-dont-shop/lib.components';

<StatusBadge kind='pet' status={pet.status} />
<StatusBadge kind='application' status={application.status} />
<StatusBadge kind='pet' status={pet.status} label='Available for Adoption' />
<StatusBadge variant='info' label='Beta' />
```

Status values outside the kind's canonical set (a new backend status, missing data) render as
a neutral badge with a humanised label rather than throwing.

## Props

Either a status from a domain, or an explicit variant and label.

| Prop                       | Type                                                                          | Required       | Description                                       |
| -------------------------- | ----------------------------------------------------------------------------- | -------------- | ------------------------------------------------- |
| `kind`                     | `'application' \| 'pet' \| 'rescue' \| 'user' \| 'supportTicket' \| 'report'` | With `status`  | Which status map to use.                          |
| `status`                   | `string`                                                                      | With `kind`    | Raw status value.                                 |
| `label`                    | `string`                                                                      | Without `kind` | Overrides the shared label when `kind` is given.  |
| `variant`                  | `'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'`                    | Without `kind` | Overrides the shared colour when `kind` is given. |
| `size`, `rounded`, `dot`   | as `Badge`                                                                    | No             | Default to `size='sm'`, `rounded`.                |
| `className`, `data-testid` | `string`                                                                      | No             | Passed to the underlying `Badge`.                 |
