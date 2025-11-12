# @adopt-dont-shop/lib-rescue

Rescue organization data and management

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-rescue

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-rescue": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { RescueService, RescueServiceConfig } from '@adopt-dont-shop/lib-rescue';

// Using the singleton instance
import { rescueService } from '@adopt-dont-shop/lib-rescue';

// Basic usage
const result = await rescueService.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: RescueServiceConfig = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new RescueService(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
```

## 🔧 Configuration

### RescueServiceConfig

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

### RescueService

#### Constructor

```typescript
new RescueService(config?: RescueServiceConfig)
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
- `options` (RescueServiceOptions): Operation options

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
    "@adopt-dont-shop/lib-rescue": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { rescueService } from '@adopt-dont-shop/lib-rescue';

// In your component
import { rescueService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await rescueService.exampleMethod({
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
    "@adopt-dont-shop/lib-rescue": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/rescue.service.ts
import { RescueService } from '@adopt-dont-shop/lib-rescue';

export const rescueService = new RescueService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { rescueService } from '../services/rescue.service';

app.get('/api/rescue/example', async (req, res) => {
  try {
    const result = await rescueService.exampleMethod(req.body);
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
docker-compose -f docker-compose.lib.yml up lib-rescue
```

2. **Run tests:**

```bash
docker-compose -f docker-compose.lib.yml run lib-rescue-test
```

### Using in App Containers

Add to your app's Dockerfile:

```dockerfile
# Copy shared libraries
COPY lib.rescue /workspace/lib.rescue

# Install dependencies
RUN npm install @adopt-dont-shop/lib-rescue@workspace:*
```

### Multi-stage Build for Production

```dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.rescue ./lib.rescue

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.rescue && npm ci && npm run build
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
│   ├── rescue-service.ts
│   └── __tests__/
│       └── rescue-service.test.ts
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
lib.rescue/
├── src/
│   ├── services/
│   │   ├── rescue-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── rescue-service.test.ts
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
import { rescueService } from '@adopt-dont-shop/lib-rescue';

// Configure with shared dependencies
rescueService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { rescueService, ErrorResponse } from '@adopt-dont-shop/lib-rescue';

try {
  const result = await rescueService.exampleMethod(data);
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
    "@adopt-dont-shop/lib-rescue": "workspace:*"
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
rescueService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
