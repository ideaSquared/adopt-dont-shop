# EntityInspector

A tabbed detail panel for a single entity: a presentation-agnostic header slot
plus an ordered set of tabs. Used by the admin apps (often inside a
`SplitPaneDetail`) to inspect a selected row.

## Usage

```tsx
import { EntityInspector } from '@adopt-dont-shop/lib.components';

<EntityInspector
  header={<PetSummary pet={pet} />}
  resetTabsOnKeyChange={pet.id}
  onClose={() => setSelected(null)}
  tabs={[
    { id: 'overview', label: 'Overview', content: <Overview pet={pet} /> },
    { id: 'activity', label: 'Activity', content: <Activity petId={pet.id} /> },
  ]}
/>;
```

## Props

| Prop                   | Type                                | Required | Default      | Description                                                             |
| ---------------------- | ----------------------------------- | -------- | ------------ | ----------------------------------------------------------------------- |
| `header`               | `React.ReactNode`                   | Yes      | —            | Left-of-header slot (avatar, name, badges).                             |
| `tabs`                 | `ReadonlyArray<EntityInspectorTab>` | Yes      | —            | Ordered tabs; `{ id, label, content }`.                                 |
| `defaultTabId`         | `string`                            | No       | `tabs[0].id` | Tab selected on first render.                                           |
| `resetTabsOnKeyChange` | `string \| number`                  | No       | —            | When this changes, resets to the default tab (e.g. pass the entity id). |
| `onClose`              | `() => void`                        | No       | —            | Shows a close button that calls this; omit to hide it.                  |
| `closeLabel`           | `string`                            | No       | —            | Accessible label for the close button.                                  |
| `className`            | `string`                            | No       | —            | Extra class on the container.                                           |
| `data-testid`          | `string`                            | No       | —            | Test id on the container.                                               |

`EntityInspectorTab` is `{ id: string; label: string; content: React.ReactNode }`.

## Accessibility

The tab strip renders as a `role="tablist"` of `role="tab"` buttons with
`aria-selected` and `aria-controls`; the body is a `role="tabpanel"` labelled by
its tab. Give the close button a meaningful `closeLabel`. Tab `label`s are the
accessible names, so keep them concise and unique within the panel.
