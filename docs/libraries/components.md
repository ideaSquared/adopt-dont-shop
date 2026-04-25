# lib.components - Modern React Component Library

## Overview

This package contains shared UI components, hooks, and utilities used across all Adopt Don't Shop applications.

## Structure

```
lib.components/
├── src/
│   ├── components/
│   │   ├── ui/          # Core UI components (Button, Input, Card, etc.)
│   │   ├── forms/       # Form-related components
│   │   ├── layout/      # Layout components
│   │   ├── pet/         # Pet-related components
│   │   ├── application/ # Application-related components
│   │   ├── communication/ # Messaging components
│   │   └── data/        # Data display components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main export file
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Adding New Components

1. Create the component in the appropriate directory under `src/components/`.
2. Export it from `src/index.ts`.
3. Add a co-located test (`Component.test.tsx`) — Vitest + React Testing Library.

(There is no Storybook setup in this package today.)

## Building

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build
```

## Testing

```bash
npm run test
```

## Best Practices

- Each component should have a corresponding TypeScript type definition.
- Use `React.forwardRef` where it makes sense for ref-forwarding / composition.
- This package uses `styled-components` for styling — there is no `cn()` class-merging utility in scope.
- Follow the composition pattern for complex components.
