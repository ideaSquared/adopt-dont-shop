# @adopt-dont-shop/lib-auth

Authentication and authorization functionality

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-auth

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-auth": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { AuthService, AuthServiceConfig } from '@adopt-dont-shop/lib-auth';

// Using the singleton instance
import { authService } from '@adopt-dont-shop/lib-auth';

// Basic usage
const result = await authService.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: AuthServiceConfig = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new AuthService(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
```

## 🔧 Configuration

### AuthServiceConfig

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

### AuthService

#### Constructor

```typescript
new AuthService(config?: AuthServiceConfig)
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
- `options` (AuthServiceOptions): Operation options

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
    "@adopt-dont-shop/lib-auth": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { authService } from '@adopt-dont-shop/lib-auth';

// In your component
import { authService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await authService.exampleMethod({
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
    "@adopt-dont-shop/lib-auth": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/auth.service.ts
import { AuthService } from '@adopt-dont-shop/lib-auth';

export const authService = new AuthService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { authService } from '../services/auth.service';

app.get('/api/auth/example', async (req, res) => {
  try {
    const result = await authService.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🐳 Docker Integration

### Development with Docker Compose

1. **Build the library:**

```bash
# From workspace root
docker-compose -f docker-compose.lib.yml up lib-auth
```

2. **Run tests:**

```bash
docker-compose -f docker-compose.lib.yml run lib-auth-test
```

### Using in App Containers

Add to your app's Dockerfile:

```dockerfile
# Copy shared libraries
COPY lib.auth /workspace/lib.auth

# Install dependencies
RUN npm install @adopt-dont-shop/lib-auth@workspace:*
```

### Multi-stage Build for Production

```dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.auth ./lib.auth

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.auth && npm ci && npm run build
RUN cd app.client && npm ci

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./

# Copy app source
COPY app.client ./app.client

# Build app
RUN cd app.client && npm run build
```

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
│   ├── auth-service.ts
│   └── __tests__/
│       └── auth-service.test.ts
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
lib.auth/
├── src/
│   ├── services/
│   │   ├── auth-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── auth-service.test.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── docker-compose.lib.yml           # Docker compose for development
├── Dockerfile                       # Multi-stage Docker build
├── jest.config.js                   # Jest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { authService } from '@adopt-dont-shop/lib-auth';

// Configure with shared dependencies
authService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { authService, ErrorResponse } from '@adopt-dont-shop/lib-auth';

try {
  const result = await authService.exampleMethod(data);
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
    "@adopt-dont-shop/lib-auth": "workspace:*"
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
authService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
