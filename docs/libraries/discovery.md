# @adopt-dont-shop/lib-discovery

Content discovery and recommendation engine with intelligent feed generation, trending content, and user engagement tracking

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-discovery

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-discovery": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { DiscoveryService, DiscoveryServiceConfig } from '@adopt-dont-shop/lib-discovery';

// Using the singleton instance
import { discoveryService } from '@adopt-dont-shop/lib-discovery';

// Get personalized feed
const feed = await discoveryService.getPersonalizedFeed('user_123', {
  limit: 20,
  includeRecommendations: true,
});

// Get trending content
const trending = await discoveryService.getTrendingContent({
  timeframe: 'week',
  categories: ['pets', 'success-stories'],
});

// Advanced configuration
const service = new DiscoveryService({
  apiUrl: 'https://api.example.com',
  enableAI: true,
  cacheTtl: 300000,
  debug: true,
});
```

## 🔧 Configuration

### DiscoveryServiceConfig

| Property       | Type      | Default                    | Description                       |
| -------------- | --------- | -------------------------- | --------------------------------- |
| `apiUrl`       | `string`  | `process.env.VITE_API_URL` | Backend API URL                   |
| `enableAI`     | `boolean` | `true`                     | Enable AI-powered recommendations |
| `cacheTtl`     | `number`  | `300000`                   | Cache TTL in milliseconds (5 min) |
| `maxFeedItems` | `number`  | `100`                      | Maximum items per feed            |
| `debug`        | `boolean` | `false`                    | Enable debug logging              |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# AI Services
OPENAI_API_KEY=your-openai-key
VITE_AI_ENABLED=true

# Development
NODE_ENV=development
```

## 📖 API Reference

### DiscoveryService

#### Personalized Feed

##### `getPersonalizedFeed(userId, options?)`

Get a personalized content feed for a user.

```typescript
const feed = await discoveryService.getPersonalizedFeed('user_123', {
  limit: 20,
  offset: 0,
  includeRecommendations: true,
  includeNew: true,
  includeTrending: true,
  categories: ['pets', 'success-stories', 'events'],
  refreshUserModel: false,
  diversityFactor: 0.3, // 0 = pure relevance, 1 = maximum diversity
});

// Returns:
// {
//   items: [
//     {
//       id: 'content_123',
//       type: 'pet',
//       title: 'Meet Buddy - Looking for a Home',
//       description: '...',
//       score: 0.92,
//       reason: 'matches your preferences',
//       timestamp: '2024-01-15T10:30:00Z'
//     }
//   ],
//   hasMore: true,
//   nextOffset: 20,
//   personalizedFor: 'user_123'
// }
```

##### `updateUserPreferences(userId, preferences)`

Update user preferences for better personalization.

```typescript
await discoveryService.updateUserPreferences('user_123', {
  species: ['dog', 'cat'],
  sizes: ['medium', 'large'],
  ages: { min: 1, max: 8 },
  characteristics: {
    goodWithKids: true,
    energyLevel: 'medium',
  },
  interests: ['training', 'health', 'success-stories'],
  location: {
    latitude: 45.5152,
    longitude: -122.6784,
    radius: 50,
  },
});
```

##### `getUserInsights(userId, options?)`

Get insights about user behavior and preferences.

```typescript
const insights = await discoveryService.getUserInsights('user_123', {
  timeframe: 'month',
  includeRecommendations: true,
});

// Returns:
// {
//   engagementStats: {
//     itemsViewed: 145,
//     itemsLiked: 23,
//     itemsShared: 5,
//     avgSessionTime: 8.5
//   },
//   preferences: {
//     topCategories: ['dogs', 'puppies', 'training'],
//     preferredContentTypes: ['photos', 'videos', 'articles'],
//     optimalPostingTimes: ['09:00', '18:00', '20:00']
//   },
//   recommendations: ['increase photo content', 'focus on training tips']
// }
```

#### Trending Content

##### `getTrendingContent(options?)`

Get trending content across the platform.

```typescript
const trending = await discoveryService.getTrendingContent({
  timeframe: 'week', // 'hour', 'day', 'week', 'month'
  categories: ['pets', 'success-stories', 'events'],
  contentTypes: ['photo', 'video', 'article'],
  location: {
    city: 'Portland',
    radius: 100,
  },
  limit: 50,
  minEngagement: 10,
});
```

##### `getTrendingTags(options?)`

Get trending hashtags and topics.

```typescript
const trendingTags = await discoveryService.getTrendingTags({
  timeframe: 'day',
  category: 'pets',
  minCount: 5,
  limit: 20,
});

// Returns: ['#adoptdontshop', '#goldenretriever', '#rescuedog', ...]
```

##### `getViralContent(options?)`

Get content that's going viral.

```typescript
const viralContent = await discoveryService.getViralContent({
  timeframe: 'day',
  minViralityScore: 0.8,
  categories: ['pets', 'success-stories'],
  limit: 10,
});
```

#### Content Recommendations

##### `getRecommendedContent(userId, options?)`

Get content recommendations for a user.

```typescript
const recommendations = await discoveryService.getRecommendedContent('user_123', {
  type: 'pets', // 'pets', 'articles', 'events', 'rescues'
  count: 10,
  includeReasons: true,
  excludeViewed: true,
  freshnessFactor: 0.2, // 0 = ignore recency, 1 = prioritize new content
  diversityFactor: 0.3,
});
```

##### `getSimilarContent(contentId, options?)`

Find content similar to a specific item.

```typescript
const similarContent = await discoveryService.getSimilarContent('content_123', {
  count: 8,
  similarityFactors: ['category', 'tags', 'description'],
  excludeAuthor: false,
  maxAge: '30d',
});
```

##### `getContentForCategory(category, options?)`

Get content for a specific category with intelligent curation.

```typescript
const categoryContent = await discoveryService.getContentForCategory('success-stories', {
  curationStrategy: 'balanced', // 'popular', 'recent', 'balanced', 'diverse'
  limit: 20,
  includePersonalization: true,
  userId: 'user_123',
});
```

#### Engagement Tracking

##### `trackContentInteraction(userId, contentId, interaction)`

Track user interactions with content.

```typescript
await discoveryService.trackContentInteraction('user_123', 'content_456', {
  type: 'view',
  duration: 15000, // milliseconds
  metadata: {
    source: 'feed',
    position: 3,
    context: 'personalized',
  },
});

// Other interaction types: 'like', 'share', 'comment', 'save', 'apply'
```

##### `batchTrackInteractions(interactions)`

Track multiple interactions efficiently.

```typescript
await discoveryService.batchTrackInteractions([
  {
    userId: 'user_123',
    contentId: 'content_456',
    type: 'view',
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    userId: 'user_123',
    contentId: 'content_789',
    type: 'like',
    timestamp: '2024-01-15T10:32:00Z',
  },
]);
```

##### `getContentMetrics(contentId, options?)`

Get engagement metrics for specific content.

```typescript
const metrics = await discoveryService.getContentMetrics('content_123', {
  timeframe: 'week',
  includeBreakdown: true,
});

// Returns:
// {
//   views: 1250,
//   likes: 89,
//   shares: 12,
//   comments: 34,
//   engagementRate: 0.108,
//   viralityScore: 0.65,
//   breakdown: {
//     byHour: [...],
//     byDay: [...],
//     bySource: { feed: 70%, search: 20%, direct: 10% }
//   }
// }
```

#### Content Curation

##### `createContentCollection(userId, collectionData)`

Create a curated collection of content.

```typescript
const collection = await discoveryService.createContentCollection('user_123', {
  name: 'My Favorite Success Stories',
  description: 'Heartwarming adoption success stories',
  visibility: 'public', // 'public', 'private', 'followers'
  contentIds: ['content_123', 'content_456', 'content_789'],
  tags: ['inspiration', 'success', 'adoption'],
});
```

##### `getContentCollections(userId, options?)`

Get user's content collections.

```typescript
const collections = await discoveryService.getContentCollections('user_123', {
  includePublic: true,
  includeShared: true,
  sortBy: 'updated',
  limit: 20,
});
```

##### `getFeaturedCollections(options?)`

Get featured content collections.

```typescript
const featured = await discoveryService.getFeaturedCollections({
  category: 'pets',
  timeframe: 'month',
  minItems: 5,
  limit: 10,
});
```

#### Discovery Analytics

##### `getDiscoveryMetrics(options?)`

Get discovery and engagement analytics.

```typescript
const metrics = await discoveryService.getDiscoveryMetrics({
  timeframe: 'week',
  includeUserSegments: true,
  includeContentBreakdown: true,
});

// Returns:
// {
//   totalInteractions: 15420,
//   uniqueUsers: 3240,
//   avgSessionTime: 7.8,
//   contentDistribution: {
//     pets: 45%,
//     articles: 30%,
//     events: 15%,
//     other: 10%
//   },
//   topPerformingContent: [...]
// }
```

##### `getRecommendationPerformance(options?)`

Get recommendation system performance metrics.

```typescript
const performance = await discoveryService.getRecommendationPerformance({
  timeframe: 'month',
  includeABTestResults: true,
});

// Returns:
// {
//   clickThroughRate: 0.12,
//   conversionRate: 0.08,
//   userSatisfactionScore: 4.2,
//   algorithmPerformance: {
//     collaborative: 0.15,
//     contentBased: 0.11,
//     hybrid: 0.18
//   }
// }
```

##### `getContentPerformancePrediction(contentId)`

Predict content performance using AI.

```typescript
const prediction = await discoveryService.getContentPerformancePrediction('content_123');

// Returns:
// {
//   predictedViews: 2500,
//   predictedEngagement: 0.15,
//   optimalPostingTime: '2024-01-15T18:00:00Z',
//   suggestedTags: ['#adoptdontshop', '#rescuedog'],
//   confidenceScore: 0.87
// }
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Discovery Context
import { createContext, useContext, useState } from 'react';
import { DiscoveryService } from '@adopt-dont-shop/lib-discovery';

const DiscoveryContext = createContext<DiscoveryService | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new DiscoveryService({
    enableAI: true,
    debug: process.env.NODE_ENV === 'development'
  }));

  return (
    <DiscoveryContext.Provider value={service}>
      {children}
    </DiscoveryContext.Provider>
  );
}

export const useDiscovery = () => {
  const service = useContext(DiscoveryContext);
  if (!service) throw new Error('useDiscovery must be used within DiscoveryProvider');
  return service;
};

// Personalized Feed Hook
export function usePersonalizedFeed(userId: string) {
  const service = useDiscovery();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = async (refresh = false) => {
    setLoading(true);
    try {
      const result = await service.getPersonalizedFeed(userId, {
        limit: 20,
        offset: refresh ? 0 : feed.length
      });

      setFeed(refresh ? result.items : [...feed, ...result.items]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackInteraction = async (contentId: string, type: string) => {
    await service.trackContentInteraction(userId, contentId, { type });
  };

  useEffect(() => {
    if (userId) loadFeed(true);
  }, [userId]);

  return { feed, loading, hasMore, loadFeed, trackInteraction };
}

// Trending Content Hook
export function useTrendingContent(category?: string) {
  const service = useDiscovery();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const result = await service.getTrendingContent({
          categories: category ? [category] : undefined,
          timeframe: 'day',
          limit: 10
        });
        setTrending(result);
      } catch (error) {
        console.error('Error loading trending content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, [category]);

  return { trending, loading };
}

// In components
function PersonalizedFeed({ userId }: { userId: string }) {
  const { feed, loading, hasMore, loadFeed, trackInteraction } = usePersonalizedFeed(userId);

  const handleContentClick = (contentId: string) => {
    trackInteraction(contentId, 'view');
  };

  const handleLike = (contentId: string) => {
    trackInteraction(contentId, 'like');
  };

  return (
    <div className="feed">
      {feed.map(item => (
        <ContentCard
          key={item.id}
          content={item}
          onClick={() => handleContentClick(item.id)}
          onLike={() => handleLike(item.id)}
        />
      ))}

      {hasMore && (
        <button onClick={() => loadFeed()} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function TrendingSection({ category }: { category?: string }) {
  const { trending, loading } = useTrendingContent(category);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="trending-section">
      <h2>Trending Now</h2>
      <div className="trending-grid">
        {trending.map(item => (
          <TrendingCard key={item.id} content={item} />
        ))}
      </div>
    </div>
  );
}

function DiscoveryDashboard() {
  const service = useDiscovery();
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const [recs, userInsights] = await Promise.all([
        service.getRecommendedContent(userId, { count: 6 }),
        service.getUserInsights(userId)
      ]);

      setRecommendations(recs);
      setInsights(userInsights);
    };

    loadData();
  }, []);

  return (
    <div>
      <RecommendedContent recommendations={recommendations} />
      <UserInsights insights={insights} />
      <TrendingSection />
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/discovery.service.ts
import { DiscoveryService } from '@adopt-dont-shop/lib-discovery';

export const discoveryService = new DiscoveryService({
  apiUrl: process.env.API_URL,
  enableAI: process.env.AI_ENABLED === 'true',
  debug: process.env.NODE_ENV === 'development',
});

// In routes
app.get('/api/users/:id/feed', async (req, res) => {
  try {
    const feed = await discoveryService.getPersonalizedFeed(req.params.id, {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const trending = await discoveryService.getTrendingContent({
      timeframe: req.query.timeframe || 'day',
      categories: req.query.categories?.split(','),
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load trending content' });
  }
});

app.post('/api/interactions', async (req, res) => {
  try {
    await discoveryService.trackContentInteraction(
      req.body.userId,
      req.body.contentId,
      req.body.interaction
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to track interaction' });
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Personalized feed generation
- ✅ Trending content algorithms
- ✅ Recommendation systems
- ✅ Content curation
- ✅ Engagement tracking
- ✅ Analytics and metrics
- ✅ AI-powered insights

Run tests:

```bash
npm run test:lib-discovery
```

## 🚀 Key Features

### Intelligent Content Discovery

- **Personalized Feeds**: AI-driven content curation based on user behavior
- **Trending Detection**: Real-time identification of viral and popular content
- **Smart Recommendations**: Multi-algorithm recommendation system
- **Content Collections**: Curated content groupings and playlists

### Advanced Analytics

- **Engagement Tracking**: Comprehensive user interaction monitoring
- **Performance Metrics**: Content and recommendation system analytics
- **User Insights**: Behavioral analysis and preference detection
- **Predictive Analytics**: AI-powered performance predictions

### Content Curation

- **Automated Curation**: AI-assisted content organization
- **Editorial Tools**: Manual curation and featured content management
- **Quality Scoring**: Content quality assessment and ranking
- **Diversity Optimization**: Balanced content distribution algorithms

### Real-time Intelligence

- **Live Trending**: Real-time trending content detection
- **Dynamic Personalization**: Adaptive user preference learning
- **A/B Testing**: Recommendation algorithm optimization
- **Performance Monitoring**: System health and efficiency tracking

## 🔧 Troubleshooting

### Common Issues

**Personalized feed not updating**:

- Check user preference synchronization
- Verify interaction tracking functionality
- Review recommendation model training status

**Poor recommendation quality**:

- Increase user interaction data collection
- Tune recommendation algorithm parameters
- Review content quality and metadata

**Trending content not appearing**:

- Check engagement threshold settings
- Verify real-time data processing
- Review trending algorithm sensitivity

### Debug Mode

```typescript
const discovery = new DiscoveryService({
  debug: true, // Enables detailed recommendation logging
});
```

This library provides sophisticated content discovery and recommendation capabilities optimized for pet adoption platforms with AI-powered personalization and comprehensive analytics.
