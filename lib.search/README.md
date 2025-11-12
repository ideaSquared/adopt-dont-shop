# @adopt-dont-shop/lib-search

Advanced search library with intelligent caching, faceted search, and comprehensive analytics for pet and message search functionality.

## Overview

This library provides comprehensive search functionality including pet search with advanced filters, message search within conversations, intelligent caching with TTL and LRU eviction, search suggestions, faceted search, and performance analytics.

## Features

- **Pet Search**: Advanced filtering by type, breed, size, age, location, and more
- **Message Search**: Search within chat conversations with date ranges and filters
- **Intelligent Caching**: LRU cache with TTL for optimal performance
- **Search Suggestions**: Autocomplete and query suggestions
- **Faceted Search**: Advanced search with dynamic filter facets
- **Performance Analytics**: Comprehensive search metrics and tracking
- **Geographic Search**: Location-based search with radius filtering
- **Real-time Search**: Live search suggestions and instant results
- **Error Resilience**: Graceful degradation when API is unavailable

## Installation

```bash
npm install @adopt-dont-shop/lib-search
```

## Usage

### Basic Setup

```typescript
import { SearchService } from '@adopt-dont-shop/lib-search';

const searchService = new SearchService({
  apiUrl: 'https://api.example.com',
  debug: true,
});
```

### Pet Search

```typescript
import { PetSearchFilters } from '@adopt-dont-shop/lib-search';

const filters: PetSearchFilters = {
  type: 'dog',
  size: 'large',
  ageGroup: 'young',
  location: 'New York, NY',
  maxDistance: 50,
  page: 1,
  limit: 12,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

const results = await searchService.searchPets(filters);
console.log(`Found ${results.pagination.total} pets`);
```

### Message Search

```typescript
import { MessageSearchOptions } from '@adopt-dont-shop/lib-search';

const searchOptions: MessageSearchOptions = {
  query: 'friendly dog',
  conversationId: 'conv-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  sortBy: 'relevance',
  sortOrder: 'DESC',
  page: 1,
  limit: 50,
};

const results = await searchService.searchMessages(searchOptions);
console.log(`Found ${results.total} messages in ${results.queryTime}ms`);
```

### Search Suggestions

```typescript
const suggestions = await searchService.getSearchSuggestions('golden', 'pets');
console.log('Search suggestions:', suggestions);
```

### Faceted Search

```typescript
import { AdvancedSearchOptions } from '@adopt-dont-shop/lib-search';

const advancedOptions: AdvancedSearchOptions = {
  includeTypes: ['pet'],
  location: {
    lat: 40.7128,
    lng: -74.006,
    radius: 25,
  },
  facets: ['type', 'size', 'age', 'breed'],
  boost: {
    title: 2.0,
    description: 1.5,
  },
};

const results = await searchService.facetedSearch('friendly companion', advancedOptions);
console.log('Faceted results:', results.results);
console.log('Available facets:', results.facets);
```

### Cache Management

```typescript
// Get search metrics
const metrics = searchService.getSearchMetrics();
console.log(
  `Cache hit rate: ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100}%`
);

// Get cache statistics
const stats = searchService.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);

// Clear cache
searchService.clearCache();
```

## API Reference

### SearchService

#### Constructor

```typescript
new SearchService(config?: SearchServiceConfig)
```

**Parameters:**

- `config.apiUrl` - Base API URL
- `config.debug` - Enable debug logging
- `config.headers` - Custom headers for requests

#### Methods

##### searchPets(filters?, options?)

Search for pets with advanced filtering and sorting.

**Parameters:**

- `filters: PetSearchFilters` - Search filters and pagination
- `options?: SearchServiceOptions` - Request options

**Returns:** `Promise<PaginatedResponse<SearchResult>>`

##### searchMessages(searchOptions, options?)

Search messages within conversations.

**Parameters:**

- `searchOptions: MessageSearchOptions` - Message search criteria
- `options?: SearchServiceOptions` - Request options

**Returns:** `Promise<MessageSearchResponse>`

##### getSearchSuggestions(query, type?, options?)

Get search suggestions and autocomplete.

**Parameters:**

- `query: string` - Partial search query
- `type?: 'pets' | 'messages' | 'all'` - Type of suggestions
- `options?: SearchServiceOptions` - Request options

**Returns:** `Promise<SearchSuggestion[]>`

##### facetedSearch(query, advancedOptions?, options?)

Perform faceted search with advanced filtering.

**Parameters:**

- `query: string` - Search query
- `advancedOptions?: AdvancedSearchOptions` - Advanced search options
- `options?: SearchServiceOptions` - Request options

**Returns:** `Promise<FacetedSearchResponse>`

##### getSearchMetrics()

Get search analytics and metrics.

**Returns:** `SearchMetrics`

##### getCacheStats()

Get cache statistics.

**Returns:** `{ size: number; hitRate: number; maxSize: number }`

##### clearCache()

Clear search cache.

**Returns:** `void`

### Types

#### PetSearchFilters

```typescript
interface PetSearchFilters {
  type?: string;
  breed?: string;
  size?: string;
  gender?: string;
  location?: string;
  ageGroup?: string;
  status?: string;
  search?: string;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

#### MessageSearchOptions

```typescript
interface MessageSearchOptions {
  query: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  startDate?: Date;
  endDate?: Date;
  messageType?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'sender';
  sortOrder?: 'ASC' | 'DESC';
}
```

#### SearchResult

```typescript
interface SearchResult {
  id: string;
  type: 'pet' | 'message' | 'rescue' | 'other';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  relevanceScore?: number;
  createdAt: string;
  updatedAt?: string;
  highlight?: string;
}
```

#### AdvancedSearchOptions

```typescript
interface AdvancedSearchOptions {
  includeTypes?: string[];
  excludeTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  customFilters?: Record<string, unknown>;
  facets?: string[];
  boost?: Record<string, number>;
}
```

#### SearchMetrics

```typescript
interface SearchMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  popularQueries: Map<string, number>;
  performanceData: {
    fastQueries: number; // < 100ms
    mediumQueries: number; // 100-500ms
    slowQueries: number; // > 500ms
  };
}
```

## Caching Strategy

### Intelligent Caching

The search service uses an intelligent caching strategy:

- **TTL (Time To Live)**: 5 minutes default
- **LRU Eviction**: Least Recently Used items removed when cache is full
- **Max Size**: 200 entries by default
- **Automatic Cleanup**: Expired entries cleaned every minute

### Cache Key Generation

Cache keys are generated based on:

- Search type (pets, messages, faceted)
- All search parameters sorted alphabetically
- Base64 encoded for consistent formatting

### Performance Benefits

- **Reduced API Calls**: Repeat searches served from cache
- **Faster Response Times**: Cached results returned instantly
- **Lower Server Load**: Fewer requests to backend APIs
- **Better User Experience**: Instant search results for common queries

## Search Analytics

### Tracked Metrics

- **Query Performance**: Fast (<100ms), medium (100-500ms), slow (>500ms)
- **Cache Efficiency**: Hit rate, miss rate, eviction rate
- **Popular Queries**: Most searched terms and filters
- **User Behavior**: Search patterns and preferences

### Performance Monitoring

```typescript
const metrics = searchService.getSearchMetrics();

console.log('Performance breakdown:');
console.log(`Fast queries: ${metrics.performanceData.fastQueries}`);
console.log(`Medium queries: ${metrics.performanceData.mediumQueries}`);
console.log(`Slow queries: ${metrics.performanceData.slowQueries}`);

console.log(`Average query time: ${metrics.averageQueryTime}ms`);
console.log(
  `Cache hit rate: ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100}%`
);
```

## Error Handling

The service provides comprehensive error handling:

- **API Failures**: Returns empty results with error status
- **Network Issues**: Graceful degradation with cached results
- **Invalid Parameters**: Clear error messages and fallbacks
- **Timeout Handling**: Configurable request timeouts
- **Debug Logging**: Detailed error information in development

## Testing

```bash
npm test
```

The library includes comprehensive tests covering:

- Pet search with various filter combinations
- Message search with date ranges and sorting
- Search suggestions and autocomplete
- Faceted search with advanced options
- Cache management and eviction
- Performance tracking and metrics
- Error handling and edge cases

## Configuration

### Environment Variables

- `SEARCH_CACHE_TTL` - Cache TTL in milliseconds (default: 300000)
- `SEARCH_CACHE_MAX_SIZE` - Maximum cache entries (default: 200)
- `SEARCH_API_TIMEOUT` - Request timeout in milliseconds (default: 10000)

### Advanced Configuration

```typescript
const searchService = new SearchService({
  apiUrl: 'https://api.example.com',
  debug: process.env.NODE_ENV === 'development',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Client-Version': '1.0.0',
  },
});
```

## Dependencies

- **lib.api**: HTTP transport layer for API communication

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the library
npm run build

# Type checking
npm run type-check
```

## Performance Tips

1. **Use Caching**: Enable caching for frequently repeated searches
2. **Optimize Filters**: Use specific filters to reduce result sets
3. **Pagination**: Use appropriate page sizes (12-50 items)
4. **Debounce**: Implement search debouncing for real-time search
5. **Preload**: Preload common searches during idle time

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### SearchService

#### Constructor

```typescript
new SearchService(config?: SearchServiceConfig)
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
- `options` (SearchServiceOptions): Operation options

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
    "@adopt-dont-shop/lib-search": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { searchService } from '@adopt-dont-shop/lib-search';

// In your component
import { searchService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await searchService.exampleMethod({
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
    "@adopt-dont-shop/lib-search": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/search.service.ts
import { SearchService } from '@adopt-dont-shop/lib-search';

export const searchService = new SearchService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { searchService } from '../services/search.service';

app.get('/api/search/example', async (req, res) => {
  try {
    const result = await searchService.exampleMethod(req.body);
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
docker-compose -f docker-compose.lib.yml up lib-search
```

2. **Run tests:**

```bash
docker-compose -f docker-compose.lib.yml run lib-search-test
```

### Using in App Containers

Add to your app's Dockerfile:

```dockerfile
# Copy shared libraries
COPY lib.search /workspace/lib.search

# Install dependencies
RUN npm install @adopt-dont-shop/lib-search@workspace:*
```

### Multi-stage Build for Production

```dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.search ./lib.search

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.search && npm ci && npm run build
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
│   ├── search-service.ts
│   └── __tests__/
│       └── search-service.test.ts
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
lib.search/
├── src/
│   ├── services/
│   │   ├── search-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── search-service.test.ts
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
import { searchService } from '@adopt-dont-shop/lib-search';

// Configure with shared dependencies
searchService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { searchService, ErrorResponse } from '@adopt-dont-shop/lib-search';

try {
  const result = await searchService.exampleMethod(data);
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
    "@adopt-dont-shop/lib-search": "workspace:*"
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
searchService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
