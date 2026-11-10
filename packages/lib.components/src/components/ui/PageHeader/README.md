# PageHeader

The standard page heading: a single `<h1>` title (one fixed size from the type scale,
`vars.typography.size['3xl']`), an optional description underneath, and an optional
actions slot on the right. Actions wrap below the title on narrow screens, so no media
query is involved.

For page width and padding use `Container`; for vertical rhythm between page sections
use `Stack`. `PageHeader` deliberately does not provide a page container.

```tsx
import { PageHeader } from '@adopt-dont-shop/lib.components';

<PageHeader
  title='Applications'
  description='Review adoption applications for your rescue.'
  actions={<Button>New application</Button>}
/>;
```

## Props

| Prop          | Type        | Required | Description                                      |
| ------------- | ----------- | -------- | ------------------------------------------------ |
| `title`       | `ReactNode` | Yes      | Rendered as the page's `<h1>`.                   |
| `description` | `ReactNode` | No       | Supporting text under the title.                 |
| `actions`     | `ReactNode` | No       | Buttons or menus aligned to the right, wrapping. |
| `className`   | `string`    | No       | Extra class on the root `<header>`.              |
| `data-testid` | `string`    | No       | Test id on the root element.                     |
