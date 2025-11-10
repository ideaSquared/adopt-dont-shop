# @adopt-dont-shop/lib-rescue

Rescue organization management system with comprehensive profiles, volunteer coordination, and operational tools

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

// Basic rescue operations
const rescues = await rescueService.getAllRescues({ verified: true });
const rescue = await rescueService.getRescueById('rescue_123');

// Create a new rescue
const newRescue = await rescueService.createRescue({
  name: 'Happy Tails Rescue',
  email: 'contact@happytails.org',
  phone: '555-0123',
  address: {
    street: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201'
  },
  description: 'Dedicated to finding loving homes for abandoned pets'
});

// Advanced configuration
const service = new RescueService({
  apiUrl: 'https://api.example.com',
  timeout: 10000,
  retries: 3,
  debug: true
});
```

## 🔧 Configuration

### RescueServiceConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | `process.env.VITE_API_URL` | Backend API URL |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |
| `retries` | `number` | `3` | Number of retry attempts |
| `debug` | `boolean` | `false` | Enable debug logging |

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

#### Core Rescue Operations

##### `getAllRescues(filters?, options?)`

Get all rescue organizations with filtering and pagination.

```typescript
const rescues = await rescueService.getAllRescues({
  verified: true,
  status: 'active',
  location: {
    city: 'Portland',
    state: 'OR',
    radius: 50
  },
  specialties: ['dogs', 'cats'],
  capacity: { min: 10, max: 100 }
}, {
  page: 1,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'asc'
});
```

##### `getRescueById(rescueId, options?)`

Get a specific rescue by ID.

```typescript
const rescue = await rescueService.getRescueById('rescue_123', {
  includeStats: true,
  includeVolunteers: true,
  includePets: false
});
```

##### `createRescue(rescueData)`

Create a new rescue organization.

```typescript
const rescue = await rescueService.createRescue({
  name: 'Furry Friends Sanctuary',
  email: 'info@furryfriends.org',
  phone: '555-0456',
  website: 'https://furryfriends.org',
  address: {
    street: '456 Oak Avenue',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101'
  },
  description: 'No-kill shelter specializing in senior pets',
  mission: 'To provide loving care for senior and special needs animals',
  specialties: ['senior-pets', 'special-needs'],
  capacity: {
    dogs: 25,
    cats: 40,
    other: 10
  },
  facilities: ['medical-facility', 'grooming', 'training-area'],
  socialMedia: {
    facebook: 'facebook.com/furryfriends',
    instagram: '@furryfriends',
    twitter: '@furryfriends'
  }
});
```

##### `updateRescue(rescueId, updates)`

Update an existing rescue profile.

```typescript
const updatedRescue = await rescueService.updateRescue('rescue_123', {
  description: 'Updated mission and services',
  capacity: { dogs: 30, cats: 45, other: 15 },
  facilities: ['medical-facility', 'grooming', 'training-area', 'quarantine']
});
```

##### `deleteRescue(rescueId)`

Delete a rescue organization (soft delete).

```typescript
await rescueService.deleteRescue('rescue_123');
```

#### Volunteer Management

##### `getRescueVolunteers(rescueId, options?)`

Get volunteers for a rescue.

```typescript
const volunteers = await rescueService.getRescueVolunteers('rescue_123', {
  status: 'active',
  role: 'foster',
  includeSchedule: true,
  sortBy: 'joinDate'
});
```

##### `addVolunteer(rescueId, volunteerData)`

Add a volunteer to a rescue.

```typescript
const volunteer = await rescueService.addVolunteer('rescue_123', {
  userId: 'user_456',
  role: 'foster',
  skills: ['animal-care', 'transportation', 'fundraising'],
  availability: {
    monday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    saturday: { start: '08:00', end: '16:00' }
  },
  preferences: {
    animals: ['dogs', 'cats'],
    tasks: ['feeding', 'walking', 'socialization']
  }
});
```

##### `updateVolunteer(rescueId, volunteerId, updates)`

Update volunteer information.

```typescript
await rescueService.updateVolunteer('rescue_123', 'vol_789', {
  role: 'foster-coordinator',
  skills: ['animal-care', 'training', 'administration'],
  status: 'active'
});
```

##### `removeVolunteer(rescueId, volunteerId)`

Remove a volunteer from a rescue.

```typescript
await rescueService.removeVolunteer('rescue_123', 'vol_789');
```

#### Resource Management

##### `getRescueResources(rescueId, options?)`

Get rescue resources and inventory.

```typescript
const resources = await rescueService.getRescueResources('rescue_123', {
  category: 'medical',
  lowStock: true,
  includeHistory: false
});
```

##### `updateResourceInventory(rescueId, resourceId, updates)`

Update resource inventory levels.

```typescript
await rescueService.updateResourceInventory('rescue_123', 'resource_456', {
  currentStock: 25,
  minimumStock: 10,
  lastRestocked: new Date().toISOString(),
  supplier: 'Pet Supply Co.'
});
```

##### `addResourceRequest(rescueId, request)`

Create a resource request or wish list item.

```typescript
const request = await rescueService.addResourceRequest('rescue_123', {
  type: 'donation-request',
  items: [
    { name: 'Dog Food (Large Breed)', quantity: 50, priority: 'high' },
    { name: 'Cat Litter', quantity: 20, priority: 'medium' },
    { name: 'Blankets', quantity: 30, priority: 'low' }
  ],
  description: 'Winter supply needs for increased animal intake',
  deadline: '2024-02-15'
});
```

#### Events and Programs

##### `getRescueEvents(rescueId, options?)`

Get rescue events and programs.

```typescript
const events = await rescueService.getRescueEvents('rescue_123', {
  type: 'adoption-event',
  upcoming: true,
  includeRegistrations: true,
  dateRange: {
    start: '2024-01-01',
    end: '2024-03-31'
  }
});
```

##### `createEvent(rescueId, eventData)`

Create a new rescue event.

```typescript
const event = await rescueService.createEvent('rescue_123', {
  name: 'Adoption Day at Central Park',
  type: 'adoption-event',
  description: 'Meet our wonderful pets looking for homes',
  startDate: '2024-02-15T10:00:00Z',
  endDate: '2024-02-15T16:00:00Z',
  location: {
    name: 'Central Park Pavilion',
    address: '789 Park Avenue, Portland, OR 97201'
  },
  capacity: 100,
  requiresRegistration: true,
  volunteerRoles: [
    { role: 'check-in', count: 2 },
    { role: 'animal-handler', count: 4 },
    { role: 'adoption-counselor', count: 3 }
  ]
});
```

##### `updateEvent(rescueId, eventId, updates)`

Update event information.

```typescript
await rescueService.updateEvent('rescue_123', 'event_456', {
  capacity: 150,
  description: 'Updated event description with new activities'
});
```

#### Statistics and Analytics

##### `getRescueStats(rescueId, options?)`

Get rescue performance statistics.

```typescript
const stats = await rescueService.getRescueStats('rescue_123', {
  timeframe: 'year',
  includeComparisons: true,
  metrics: ['adoptions', 'intakes', 'volunteers', 'donations']
});

// Returns:
// {
//   adoptions: { total: 156, thisMonth: 12, growth: '+15%' },
//   intakes: { total: 142, thisMonth: 8, growth: '-5%' },
//   volunteers: { active: 45, new: 3 },
//   donations: { total: 25000, thisMonth: 2100 }
// }
```

##### `getAdoptionMetrics(rescueId, options?)`

Get detailed adoption metrics.

```typescript
const adoptionMetrics = await rescueService.getAdoptionMetrics('rescue_123', {
  period: 'last-6-months',
  breakdown: ['species', 'age-group', 'adoption-time']
});
```

##### `getVolunteerMetrics(rescueId, options?)`

Get volunteer engagement metrics.

```typescript
const volunteerMetrics = await rescueService.getVolunteerMetrics('rescue_123', {
  includeHours: true,
  includeRetention: true,
  period: 'quarter'
});
```

#### Financial Management

##### `getDonations(rescueId, options?)`

Get donation records.

```typescript
const donations = await rescueService.getDonations('rescue_123', {
  timeframe: 'month',
  type: 'monetary',
  minAmount: 100,
  includeRecurring: true
});
```

##### `addDonation(rescueId, donationData)`

Record a new donation.

```typescript
const donation = await rescueService.addDonation('rescue_123', {
  donorId: 'user_789',
  amount: 250,
  type: 'monetary',
  method: 'credit-card',
  recurring: false,
  designation: 'medical-fund',
  anonymous: false,
  notes: 'In memory of beloved pet Max'
});
```

##### `getExpenses(rescueId, options?)`

Get expense records.

```typescript
const expenses = await rescueService.getExpenses('rescue_123', {
  category: 'medical',
  timeframe: 'quarter',
  includeReceipts: true
});
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Rescue Context
import { createContext, useContext, useState } from 'react';
import { RescueService } from '@adopt-dont-shop/lib-rescue';

const RescueContext = createContext<RescueService | null>(null);

export function RescueProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new RescueService({
    debug: process.env.NODE_ENV === 'development'
  }));

  return (
    <RescueContext.Provider value={service}>
      {children}
    </RescueContext.Provider>
  );
}

export const useRescue = () => {
  const service = useContext(RescueContext);
  if (!service) throw new Error('useRescue must be used within RescueProvider');
  return service;
};

// Rescue Detail Hook
export function useRescueDetail(rescueId: string) {
  const service = useRescue();
  const [rescue, setRescue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchRescueData = async () => {
      try {
        const [rescueData, statsData] = await Promise.all([
          service.getRescueById(rescueId, { includeStats: true }),
          service.getRescueStats(rescueId, { timeframe: 'year' })
        ]);
        
        setRescue(rescueData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching rescue data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (rescueId) fetchRescueData();
  }, [rescueId]);

  return { rescue, stats, loading };
}

// In components
function RescueProfile({ rescueId }: { rescueId: string }) {
  const { rescue, stats, loading } = useRescueDetail(rescueId);
  const rescueService = useRescue();

  if (loading) return <LoadingSpinner />;
  if (!rescue) return <div>Rescue not found</div>;

  return (
    <div>
      <RescueHeader rescue={rescue} />
      <RescueStats stats={stats} />
      <RescueVolunteers rescueId={rescueId} />
      <RescueEvents rescueId={rescueId} />
    </div>
  );
}

function VolunteerDashboard({ rescueId }: { rescueId: string }) {
  const rescueService = useRescue();
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [volunteersData, eventsData] = await Promise.all([
        rescueService.getRescueVolunteers(rescueId),
        rescueService.getRescueEvents(rescueId, { upcoming: true })
      ]);
      
      setVolunteers(volunteersData);
      setEvents(eventsData);
    };

    loadData();
  }, [rescueId]);

  return (
    <div>
      <VolunteerList volunteers={volunteers} />
      <UpcomingEvents events={events} />
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/rescue.service.ts
import { RescueService } from '@adopt-dont-shop/lib-rescue';

export const rescueService = new RescueService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In routes
app.get('/api/rescues', async (req, res) => {
  try {
    const filters = {
      verified: req.query.verified === 'true',
      location: req.query.location,
      specialties: req.query.specialties?.split(','),
      ...req.query
    };
    
    const result = await rescueService.getAllRescues(filters, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rescues' });
  }
});

app.post('/api/rescues/:id/volunteers', async (req, res) => {
  try {
    const volunteer = await rescueService.addVolunteer(req.params.id, req.body);
    res.status(201).json(volunteer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add volunteer' });
  }
});

app.get('/api/rescues/:id/stats', async (req, res) => {
  try {
    const stats = await rescueService.getRescueStats(req.params.id, {
      timeframe: req.query.timeframe || 'year'
    });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Rescue CRUD operations
- ✅ Volunteer management
- ✅ Event creation and management
- ✅ Resource tracking
- ✅ Statistics and analytics
- ✅ Financial management
- ✅ Error handling and validation

Run tests:
```bash
npm run test:lib-rescue
```

## 🚀 Key Features

### Comprehensive Organization Management
- **Full Profiles**: Detailed rescue organization information
- **Verification System**: Trust and credibility indicators
- **Multi-location Support**: Chain and network rescue management
- **Capacity Tracking**: Real-time animal capacity monitoring

### Volunteer Coordination
- **Role Management**: Multiple volunteer roles and permissions
- **Scheduling**: Availability and shift management
- **Skills Tracking**: Volunteer capabilities and expertise
- **Communication**: Integrated messaging and notifications

### Event Management
- **Multiple Event Types**: Adoption events, fundraisers, training
- **Registration System**: Event attendance and volunteer signup
- **Resource Planning**: Equipment and supply coordination
- **Analytics**: Event performance and ROI tracking

### Financial Oversight
- **Donation Tracking**: Monetary and in-kind donation records
- **Expense Management**: Categorized spending and budgeting
- **Grant Management**: Application and reporting assistance
- **Financial Reporting**: Automated report generation

## 🔧 Troubleshooting

### Common Issues

**Volunteer data not syncing**:
- Check user permissions and rescue associations
- Verify volunteer status and role assignments
- Enable debug mode for detailed sync logs

**Event registration issues**:
- Validate event capacity and requirements
- Check registration deadline and availability
- Review volunteer role assignments

**Statistics not updating**:
- Verify data collection timeframes
- Check cached data and refresh intervals
- Review metric calculation parameters

### Debug Mode

```typescript
const rescue = new RescueService({
  debug: true // Enables comprehensive API logging
});
```

This library provides comprehensive rescue organization management capabilities optimized for animal welfare organizations with volunteer coordination, event management, and operational analytics.
