# @adopt-dont-shop/lib.{{LIB_NAME}}

{{LIB_DESCRIPTION}}

## 📦 Installation

```bash
# From the workspace root
pnpm add @adopt-dont-shop/lib.{{LIB_NAME}}

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib.{{LIB_NAME}}": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { {{SERVICE_NAME}}, {{SERVICE_NAME}}Config } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

// Using the singleton instance
import { {{LIB_NAME}}Service } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

// Basic usage
const result = await {{LIB_NAME}}Service.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: {{SERVICE_NAME}}Config = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new {{SERVICE_NAME}}(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
```

## 🔧 Configuration

### {{SERVICE_NAME}}Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | `process.env.VITE_API_BASE_URL` | Base API URL |
| `debug` | `boolean` | `process.env.NODE_ENV === 'development'` | Enable debug logging |
| `headers` | `Record<string, string>` | `{}` | Custom headers for requests |

### Environment Variables

```bash
# API Configuration (Vite apps use VITE_ prefix)
VITE_API_BASE_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### {{SERVICE_NAME}}

#### Constructor

```typescript
new {{SERVICE_NAME}}(config?: {{SERVICE_NAME}}Config)
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
    metadata: { requestId: 'abc123' }
  }
);
```

**Parameters:**
- `data` (Record<string, unknown>): Input data
- `options` ({{SERVICE_NAME}}Options): Operation options

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
    "@adopt-dont-shop/lib.{{LIB_NAME}}": "workspace:*"
  }
}
```

2. **Import and use:**
```typescript
// src/services/index.ts
export { {{LIB_NAME}}Service } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

// In your component
import { {{LIB_NAME}}Service } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await {{LIB_NAME}}Service.exampleMethod({ 
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
    "@adopt-dont-shop/lib.{{LIB_NAME}}": "workspace:*"
  }
}
```

2. **Import and use:**
```typescript
// src/services/{{LIB_NAME}}.service.ts
import { {{SERVICE_NAME}} } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

export const {{CAMEL_CASE_NAME}}Service = new {{SERVICE_NAME}}({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { {{CAMEL_CASE_NAME}}Service } from '../services/{{LIB_NAME}}.service';

app.get('/api/{{LIB_NAME}}/example', async (req, res) => {
  try {
    const result = await {{CAMEL_CASE_NAME}}Service.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🐳 Docker Integration

Libraries are automatically available to apps through the optimized workspace pattern in `Dockerfile.app.optimized`. No additional configuration needed — just add the dependency to your app's `package.json` and run `pnpm install` at the repo root.

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
src/
├── services/
│   ├── {{LIB_NAME}}-service.ts
│   └── __tests__/
│       └── {{LIB_NAME}}-service.test.ts
└── types/
    └── index.ts
```

## 🏗️ Development

### Build the Library

```bash
# Development build with watch
pnpm dev

# Production build
pnpm build

# Clean build artifacts
pnpm clean
```

### Code Quality

```bash
# Lint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm type-check
```

## 📁 Project Structure

```
lib.{{LIB_NAME}}/
├── src/
│   ├── services/
│   │   ├── {{LIB_NAME}}-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── {{LIB_NAME}}-service.test.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── vitest.config.ts                 # Vitest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── eslint.config.js                 # ESLint flat configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib.api';
import { authService } from '@adopt-dont-shop/lib.auth';
import { {{LIB_NAME}}Service } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

// Configure with shared dependencies
{{LIB_NAME}}Service.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { {{LIB_NAME}}Service, ErrorResponse } from '@adopt-dont-shop/lib.{{LIB_NAME}}';

try {
  const result = await {{LIB_NAME}}Service.exampleMethod(data);
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
pnpm build
pnpm test

# Publish
npm publish
```

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.{{LIB_NAME}}": "workspace:*"
  }
}
```

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run `pnpm build` to ensure it builds correctly
4. Run `pnpm test` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: `pnpm build`
   - Check workspace dependencies are installed: `pnpm install`

2. **Type errors**
   - Run type checking: `pnpm type-check`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: `pnpm clean && pnpm build`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

```typescript
{{LIB_NAME}}Service.updateConfig({ debug: true });
```

Or set environment variable:
```bash
NODE_ENV=development
```
