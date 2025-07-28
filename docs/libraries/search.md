# @adopt-dont-shop/lib-search

Advanced search capabilities with Elasticsearch integration, AI-powered recommendations, and intelligent filtering

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-search

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-search": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { SearchService, SearchServiceConfig } from '@adopt-dont-shop/lib-search';

// Using the singleton instance
import { searchService } from '@adopt-dont-shop/lib-search';

// Basic search
const results = await searchService.search('friendly golden retriever', {
  types: ['pets'],
  location: { city: 'Portland', radius: 25 }
});

// Advanced search with filters
const advancedResults = await searchService.advancedSearch({
  query: 'rescue dogs',
  filters: {
    species: 'dog',
    age: { min: 1, max: 5 },
    goodWithKids: true,
    location: { city: 'Seattle', radius: 50 }
  },
  sort: { field: 'adoptionPriority', order: 'desc' }
});

// Advanced configuration
const service = new SearchService({
  apiUrl: 'https://api.example.com',
  elasticsearchUrl: 'https://elasticsearch.example.com',
  enableAI: true,
  cacheTtl: 300000,
  debug: true
});
```

## 🔧 Configuration

### SearchServiceConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | `process.env.VITE_API_URL` | Backend API URL |
| `elasticsearchUrl` | `string` | `process.env.ELASTICSEARCH_URL` | Elasticsearch cluster URL |
| `enableAI` | `boolean` | `true` | Enable AI-powered recommendations |
| `cacheTtl` | `number` | `300000` | Cache TTL in milliseconds (5 min) |
| `maxResults` | `number` | `100` | Maximum results per search |
| `debug` | `boolean` | `false` | Enable debug logging |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
VITE_ELASTICSEARCH_URL=http://localhost:9200

# AI Services
OPENAI_API_KEY=your-openai-key
VITE_AI_ENABLED=true

# Development
NODE_ENV=development
```

## 📖 API Reference

### SearchService

#### Core Search Methods

##### `search(query, options?)`

Perform a basic text search across all indexed content.

```typescript
const results = await searchService.search('golden retriever puppies', {
  types: ['pets', 'rescues'],
  location: {
    latitude: 45.5152,
    longitude: -122.6784,
    radius: 25 // miles
  },
  limit: 20,
  offset: 0,
  highlight: true,
  includeStats: true
});

// Returns:
// {
//   results: [...],
//   total: 156,
//   took: 45, // milliseconds
//   aggregations: { species: { dog: 120, cat: 36 } },
//   suggestions: ['golden retriever', 'labrador retriever']
// }
```

##### `advancedSearch(searchParams)`

Perform advanced search with complex filters and sorting.

```typescript
const results = await searchService.advancedSearch({
  query: 'rescue dogs',
  filters: {
    species: 'dog',
    breed: ['golden-retriever', 'labrador-retriever'],
    age: { min: 1, max: 8 },
    size: ['medium', 'large'],
    gender: 'male',
    goodWithKids: true,
    goodWithPets: true,
    specialNeeds: false,
    status: 'available',
    rescueVerified: true,
    location: {
      city: 'Portland',
      state: 'OR',
      radius: 50
    }
  },
  sort: [
    { field: 'adoptionPriority', order: 'desc' },
    { field: 'dateAdded', order: 'desc' }
  ],
  facets: ['breed', 'age', 'size', 'location'],
  highlight: {
    fields: ['description', 'name'],
    fragmentSize: 150
  }
});
```

##### `searchSuggestions(query, options?)`

Get search suggestions and auto-complete.

```typescript
const suggestions = await searchService.searchSuggestions('golden ret', {
  types: ['pets', 'breeds'],
  maxSuggestions: 10,
  includePopular: true
});

// Returns: ['golden retriever', 'golden retriever puppy', 'golden retriever mix']
```

##### `searchByImage(imageFile, options?)`

Search for similar pets using image recognition.

```typescript
const similarPets = await searchService.searchByImage(imageFile, {
  similarity: 0.8,
  maxResults: 20,
  includeBreedPrediction: true,
  filters: {
    status: 'available',
    location: { radius: 100 }
  }
});
```

#### Specialized Search Methods

##### `searchPets(filters, options?)`

Search specifically for pets with pet-focused filters.

```typescript
const pets = await searchService.searchPets({
  species: 'dog',
  breed: 'golden-retriever',
  ageRange: { min: 2, max: 6 },
  characteristics: {
    energyLevel: 'medium',
    trainedLevel: 'house-trained',
    goodWithKids: true
  },
  location: {
    coordinates: [45.5152, -122.6784],
    radius: 30
  }
}, {
  sortBy: 'matchScore',
  includeRecommendations: true,
  personalizeFor: 'user_123'
});
```

##### `searchRescues(filters, options?)`

Search for rescue organizations.

```typescript
const rescues = await searchService.searchRescues({
  specialties: ['dogs', 'senior-pets'],
  location: {
    city: 'Seattle',
    radius: 50
  },
  verified: true,
  capacity: { min: 10 },
  services: ['veterinary-care', 'training']
}, {
  sortBy: 'rating',
  includeDistance: true,
  includeAvailability: true
});
```

##### `searchEvents(filters, options?)`

Search for adoption events and activities.

```typescript
const events = await searchService.searchEvents({
  type: 'adoption-event',
  dateRange: {
    start: '2024-01-01',
    end: '2024-03-31'
  },
  location: {
    city: 'Portland',
    radius: 25
  },
  hasAvailablePets: true
}, {
  sortBy: 'date',
  includeEventDetails: true
});
```

#### AI-Powered Recommendations

##### `getPersonalizedRecommendations(userId, options?)`

Get AI-powered pet recommendations based on user preferences.

```typescript
const recommendations = await searchService.getPersonalizedRecommendations('user_123', {
  count: 10,
  includeReasons: true,
  refreshUserModel: false,
  filters: {
    maxDistance: 50,
    status: 'available'
  }
});

// Returns:
// {
//   recommendations: [
//     {
//       pet: { ... },
//       score: 0.92,
//       reasons: ['matches energy level', 'good with kids', 'breed preference']
//     }
//   ],
//   userProfile: { preferences: { ... }, history: { ... } }
// }
```

##### `getSimilarPets(petId, options?)`

Find pets similar to a specific pet.

```typescript
const similarPets = await searchService.getSimilarPets('pet_123', {
  count: 8,
  similarityFactors: ['breed', 'age', 'size', 'temperament'],
  excludeAdopted: true,
  maxDistance: 100
});
```

##### `getPetMatchScore(petId, userId)`

Calculate compatibility score between a pet and user.

```typescript
const matchScore = await searchService.getPetMatchScore('pet_123', 'user_456');

// Returns:
// {
//   score: 0.87,
//   factors: {
//     lifestyle: 0.9,
//     experience: 0.8,
//     living_situation: 0.95,
//     preferences: 0.85
//   },
//   recommendations: ['Consider this pet - high compatibility!']
// }
```

#### Search Analytics

##### `getSearchAnalytics(options?)`

Get search usage analytics and insights.

```typescript
const analytics = await searchService.getSearchAnalytics({
  timeframe: 'last-30-days',
  includePopularTerms: true,
  includeConversions: true,
  breakdownBy: ['location', 'device']
});

// Returns:
// {
//   totalSearches: 15420,
//   uniqueUsers: 3240,
//   popularTerms: ['golden retriever', 'rescue dogs', 'cat adoption'],
//   conversionRate: 0.12,
//   avgResultsClicked: 2.3
// }
```

##### `getSearchTrends(options?)`

Get trending search terms and patterns.

```typescript
const trends = await searchService.getSearchTrends({
  period: 'week',
  category: 'pets',
  includeSeasonality: true
});
```

##### `logSearchEvent(eventData)`

Log search events for analytics.

```typescript
await searchService.logSearchEvent({
  userId: 'user_123',
  query: 'golden retriever portland',
  results: 45,
  clicked: ['pet_456', 'pet_789'],
  converted: 'pet_456',
  timestamp: new Date().toISOString()
});
```

#### Index Management

##### `reindexContent(type, options?)`

Trigger reindexing of specific content types.

```typescript
await searchService.reindexContent('pets', {
  batchSize: 1000,
  includeMedia: true,
  updateMappings: false
});
```

##### `getIndexStats()`

Get search index statistics and health.

```typescript
const stats = await searchService.getIndexStats();

// Returns:
// {
//   pets: { count: 12450, size: '245MB', lastUpdated: '2024-01-15T10:30:00Z' },
//   rescues: { count: 1240, size: '45MB', lastUpdated: '2024-01-15T10:25:00Z' },
//   health: 'green',
//   queryPerformance: { avg: 45, p95: 120 }
// }
```

##### `optimizeIndex(type?)`

Optimize search indices for better performance.

```typescript
await searchService.optimizeIndex('pets');
// Or optimize all indices
await searchService.optimizeIndex();
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Search Context
import { createContext, useContext, useState } from 'react';
import { SearchService } from '@adopt-dont-shop/lib-search';

const SearchContext = createContext<SearchService | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new SearchService({
    enableAI: true,
    debug: process.env.NODE_ENV === 'development'
  }));

  return (
    <SearchContext.Provider value={service}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => {
  const service = useContext(SearchContext);
  if (!service) throw new Error('useSearch must be used within SearchProvider');
  return service;
};

// Search Hook
export function useSearchResults(query: string, filters: any) {
  const service = useSearch();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [facets, setFacets] = useState({});

  const performSearch = async (newQuery = query, newFilters = filters) => {
    if (!newQuery.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await service.advancedSearch({
        query: newQuery,
        filters: newFilters,
        facets: ['breed', 'age', 'size', 'location']
      });
      
      setResults(searchResults.results);
      setFacets(searchResults.aggregations);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, JSON.stringify(filters)]);

  return { results, facets, loading, performSearch };
}

// Search Suggestions Hook
export function useSearchSuggestions(query: string) {
  const service = useSearch();
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const getSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await service.searchSuggestions(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Suggestions error:', error);
      }
    };

    const debounceTimer = setTimeout(getSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return suggestions;
}

// In components
function PetSearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const { results, facets, loading } = useSearchResults(query, filters);
  const suggestions = useSearchSuggestions(query);

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        suggestions={suggestions}
        placeholder="Search for pets..."
      />
      
      <SearchFilters
        filters={filters}
        facets={facets}
        onChange={setFilters}
      />
      
      {loading && <LoadingSpinner />}
      
      <SearchResults results={results} />
    </div>
  );
}

function RecommendedPets({ userId }: { userId: string }) {
  const service = useSearch();
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const getRecommendations = async () => {
      try {
        const recs = await service.getPersonalizedRecommendations(userId, {
          count: 6,
          includeReasons: true
        });
        setRecommendations(recs.recommendations);
      } catch (error) {
        console.error('Recommendations error:', error);
      }
    };

    if (userId) getRecommendations();
  }, [userId]);

  return (
    <div>
      <h2>Recommended for You</h2>
      <div className="recommendations-grid">
        {recommendations.map(rec => (
          <PetCard 
            key={rec.pet.id} 
            pet={rec.pet}
            matchScore={rec.score}
            reasons={rec.reasons}
          />
        ))}
      </div>
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/search.service.ts
import { SearchService } from '@adopt-dont-shop/lib-search';

export const searchService = new SearchService({
  apiUrl: process.env.API_URL,
  elasticsearchUrl: process.env.ELASTICSEARCH_URL,
  enableAI: process.env.AI_ENABLED === 'true',
  debug: process.env.NODE_ENV === 'development',
});

// In routes
app.get('/api/search', async (req, res) => {
  try {
    const { q: query, type, ...filters } = req.query;
    
    const results = await searchService.advancedSearch({
      query,
      filters,
      types: type ? [type] : undefined,
      facets: ['breed', 'age', 'size', 'location'],
      highlight: true
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/search/suggestions', async (req, res) => {
  try {
    const suggestions = await searchService.searchSuggestions(req.query.q, {
      maxSuggestions: 10
    });
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

app.get('/api/users/:id/recommendations', async (req, res) => {
  try {
    const recommendations = await searchService.getPersonalizedRecommendations(
      req.params.id,
      { count: parseInt(req.query.count) || 10 }
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Basic and advanced search functionality
- ✅ AI-powered recommendations
- ✅ Search suggestions and auto-complete
- ✅ Image-based search
- ✅ Faceted search and filtering
- ✅ Analytics and logging
- ✅ Index management operations

Run tests:
```bash
npm run test:lib-search
```

## 🚀 Key Features

### Advanced Search Capabilities
- **Full-Text Search**: Elasticsearch-powered text search with relevance scoring
- **Faceted Search**: Multi-dimensional filtering and aggregation
- **Geolocation Search**: Distance-based search with radius filtering
- **Image Search**: Visual similarity search using AI

### AI-Powered Intelligence
- **Personalized Recommendations**: Machine learning-based pet matching
- **Smart Suggestions**: Context-aware auto-complete and query suggestions
- **Compatibility Scoring**: User-pet compatibility calculation
- **Behavioral Learning**: Adaptive recommendations based on user interactions

### Performance & Scalability
- **Elasticsearch Integration**: High-performance search infrastructure
- **Intelligent Caching**: Multi-layer caching for faster response times
- **Query Optimization**: Automatic query analysis and optimization
- **Real-time Indexing**: Live content updates and search availability

### Analytics & Insights
- **Search Analytics**: Comprehensive search usage tracking
- **Trend Analysis**: Popular search terms and seasonal patterns
- **Conversion Tracking**: Search-to-adoption success metrics
- **Performance Monitoring**: Query performance and system health

## 🔧 Troubleshooting

### Common Issues

**Search results not updating**:
- Check Elasticsearch connectivity and index health
- Verify reindexing processes and content updates
- Monitor index synchronization status

**Poor search relevance**:
- Review search query analysis and scoring
- Optimize index mappings and field weights
- Tune relevance parameters and boost factors

**Slow search performance**:
- Analyze query complexity and execution plans
- Optimize index structure and field mappings
- Implement appropriate caching strategies

### Debug Mode

```typescript
const search = new SearchService({
  debug: true // Enables detailed search query logging
});
```

This library provides enterprise-grade search capabilities with AI-powered recommendations, optimized for pet adoption platforms with comprehensive analytics and performance monitoring.
