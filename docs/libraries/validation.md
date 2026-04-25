# @adopt-dont-shop/lib.validation

Form validation and data validation utilities

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib.validation

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

## 🚀 Quick Start

```typescript
import { ValidationService, ValidationServiceConfig } from '@adopt-dont-shop/lib.validation';

// Using the singleton instance
import { validationService } from '@adopt-dont-shop/lib.validation';

// Basic usage
const result = await validationService.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: ValidationServiceConfig = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new ValidationService(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
```

## 🔧 Configuration

### ValidationServiceConfig

| Property  | Type                     | Default                                  | Description                 |
| --------- | ------------------------ | ---------------------------------------- | --------------------------- |
| `apiUrl`  | `string`                 | `process.env.VITE_API_URL`               | Base API URL                |
| `debug`   | `boolean`                | `process.env.NODE_ENV === 'development'` | Enable debug logging        |
| `headers` | `Record<string, string>` | `{}`                                     | Custom headers for requests |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### ValidationService

#### Constructor

```typescript
new ValidationService(config?: ValidationServiceConfig)
```

#### Methods

##### `exampleMethod(data, options)`

Example method that demonstrates the library's capabilities.

```typescript
await service.exampleMethod(
  { key: 'value' },
  {
    timeout: 5000,
    useCache: true,
    metadata: { requestId: 'abc123' },
  }
);
```

**Parameters:**

- `data` (Record<string, unknown>): Input data
- `options` (ValidationServiceOptions): Operation options

**Returns:** `Promise<BaseResponse>`

##### `updateConfig(config)`

Update the service configuration.

```typescript
service.updateConfig({ debug: true, apiUrl: 'https://new-api.com' });
```

##### `getConfig()`

Get current configuration.

```typescript
const config = service.getConfig();
```

##### `clearCache()`

Clear the internal cache.

```typescript
service.clearCache();
```

##### `healthCheck()`

Check service health.

```typescript
const isHealthy = await service.healthCheck();
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { validationService } from '@adopt-dont-shop/lib.validation';

// In your component
import { validationService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await validationService.exampleMethod({
          component: 'MyComponent'
        });
        setData(result.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  return <div>{/* Your JSX */}</div>;
}
```

### Node.js Backend (service.backend)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/validation.service.ts
import { ValidationService } from '@adopt-dont-shop/lib.validation';

export const validationService = new ValidationService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { validationService } from '../services/validation.service';

app.get('/api/validation/example', async (req, res) => {
  try {
    const result = await validationService.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🐳 Docker Integration

The library is consumed as a workspace dependency; there is no per-library Dockerfile or `docker-compose.lib.yml`. Frontend containers bind-mount the repo root so Vite resolves `@adopt-dont-shop/lib.validation` from the library's `src/` — hot reload works without a rebuild. The backend picks it up via npm workspaces on container start.

In production app Dockerfiles, copy `lib.validation/` into the build context and let Turbo handle the dependency graph:

```dockerfile
# Production build — example for a frontend app
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json turbo.json ./
COPY lib.validation/ lib.validation/
COPY lib.types/ lib.types/
COPY app.client/ app.client/

RUN npm ci
RUN npx turbo run build --filter=@adopt-dont-shop/app.client
```

See `Dockerfile.app.optimized` at the repo root for the real recipe used by all three frontend apps.

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure

```
src/
├── services/
│   ├── validation-service.ts
│   └── __tests__/
│       └── validation-service.test.ts
└── types/
    └── index.ts
```

## 🏗️ Development

### Build the Library

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Code Quality

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 📁 Project Structure

```
lib.validation/
├── src/
│   ├── services/
│   │   └── validation-service.ts     # Main service implementation
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── jest.config.cjs                   # Jest configuration
├── package.json                      # Package configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib.api';
import { authService } from '@adopt-dont-shop/lib.auth';
import { validationService } from '@adopt-dont-shop/lib.validation';

// Configure with shared dependencies
validationService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { validationService, ErrorResponse } from '@adopt-dont-shop/lib.validation';

try {
  const result = await validationService.exampleMethod(data);
  // Handle success
} catch (error) {
  const errorResponse = error as ErrorResponse;
  console.error('Error:', errorResponse.error);
  console.error('Code:', errorResponse.code);
  console.error('Details:', errorResponse.details);
}
```

## 🚀 Deployment

### NPM Package (if publishing externally)

```bash
# Build and test
npm run build
npm run test

# Publish
npm publish
```

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run `npm run build` to ensure it builds correctly
4. Run `npm test` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: `npm run build`
   - Check workspace dependencies are installed: `npm install`

2. **Type errors**
   - Run type checking: `npm run type-check`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: `npm run clean && npm run build`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

```typescript
validationService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
