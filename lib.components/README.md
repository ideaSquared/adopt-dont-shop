# `@adopt-dont-shop/lib.components`

Shared React component library and design system. Built with vanilla-extract (`.css.ts`) and bundled by Vite. Used by `app.client`, `app.admin`, and `app.rescue`.

## Install (workspace)

Apps in this monorepo depend on it via `"@adopt-dont-shop/lib.components": "*"` in their `package.json` — no install command needed.

## Quick start

```tsx
import { ThemeProvider, Button, Card, TextInput } from '@adopt-dont-shop/lib.components';
import '@adopt-dont-shop/lib.components/styles';

export function App() {
  return (
    <ThemeProvider>
      <Card>
        <TextInput label="Email" />
        <Button variant="primary">Submit</Button>
      </Card>
    </ThemeProvider>
  );
}
```

## Exports

The canonical list lives in [`src/index.ts`](./src/index.ts). Public surface, grouped:

- **Theme**: `ThemeProvider`, `useTheme`, `darkTheme`, `lightTheme`, `vars`
- **Foundation**: `Avatar`, `Badge`, `Button`, `DateTime`, `Heading`, `Spinner`, `DotSpinner`, `Text`
- **Layout**: `Container`, `Stack`, `Card` (+ `CardHeader`/`CardContent`/`CardFooter`)
- **Form**: `CheckboxInput`, `SelectInput`, `TextInput`, `TextArea`, `Input`, `FileUpload`
- **Feedback**: `Alert`, `Modal`, `ConfirmDialog`, `Toast` / `ToastContainer`
- **Navigation**: `Breadcrumbs`, `Footer`, `Header`, `Navbar`
- **Hooks**: `useConfirm`, `useToast`

Component-level READMEs live next to the source (e.g. `src/components/ui/Toast/README.md`).

## Structure

```
lib.components/src/
├── components/
│   ├── ui/          # Core UI: Button, Input, Card, Alert, Modal, Toast, ...
│   ├── form/        # Form inputs: TextInput, CheckboxInput, SelectInput, FileUpload
│   ├── layout/      # Container, Stack
│   ├── data/        # ListGroup, Table
│   └── navigation/  # Breadcrumbs, Header, Footer, Navbar
├── hooks/           # useConfirm, useToast
├── utils/           # cn(), shared helpers
├── styles/          # theme + ThemeProvider (vanilla-extract)
├── types/           # shared component prop types
└── index.ts         # public entry point
```

## Scripts

```bash
npm run dev               # vite build --watch
npm run build             # vite build (lib + theme bundle)
npm run test              # vitest run
npm run storybook         # storybook dev server on :6006
npm run build-storybook   # static storybook build
```

## Conventions

- Each component owns its directory with `*.tsx`, `*.css.ts`, `*.test.tsx`, and (where present) `*.stories.tsx`.
- Use the `cn()` utility from `src/utils/cn.ts` to merge class strings.
- Theme values come from `vars` (vanilla-extract) — don't hardcode colours.
- Forwarded refs where the underlying element makes sense as a ref target.
