# Container

Layout wrapper that constrains width, optionally goes fluid, and can center its children. Source: `Container.tsx`.

```tsx
import { Container } from '@adopt-dont-shop/lib.components';

<Container size="lg" centerContent>
  <h1>Page title</h1>
</Container>
```

## Props

| Prop            | Type                                        | Required | Default | Description                                  |
| --------------- | ------------------------------------------- | -------- | ------- | -------------------------------------------- |
| `children`      | `ReactNode`                                 | Yes      | —       | Content.                                     |
| `size`          | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'`    | No       | `'lg'`  | Max-width preset.                            |
| `fluid`         | `boolean`                                   | No       | `false` | Drop the max-width and span the parent.      |
| `centerContent` | `boolean`                                   | No       | `false` | Center children with flex.                   |
| `className`     | `string`                                    | No       | —       | Override the root element's class.           |

Standard `HTMLDivElement` attributes are also accepted via the spread on the root.
