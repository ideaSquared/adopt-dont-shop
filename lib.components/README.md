# Components Library

Shared UI components and design system.

## Documentation

See the centralized documentation: [docs/libraries/components.md](../docs/libraries/components.md)

## Installation

```bash
npm install @adopt-dont-shop/lib-components
```

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

1. Create the component in the appropriate directory
2. Export it in the index.ts file
3. Add appropriate tests
4. Document the component with Storybook

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

- Each component should have a corresponding TypeScript interface
- Components should be properly typed with React.forwardRef where appropriate
- Use the cn() utility for merging classes
- Follow composition pattern for complex components
