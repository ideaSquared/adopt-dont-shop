# @adopt-dont-shop/lib-pets

Comprehensive pet management system with breed data, medical records, adoption tracking, and media management

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-pets

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-pets": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { PetsService, PetsServiceConfig } from '@adopt-dont-shop/lib-pets';

// Using the singleton instance
import { petsService } from '@adopt-dont-shop/lib-pets';

// Basic pet operations
const pets = await petsService.getAllPets({ status: 'available' });
const pet = await petsService.getPetById('pet_123');

// Create a new pet
const newPet = await petsService.createPet({
  name: 'Buddy',
  species: 'dog',
  breed: 'Golden Retriever',
  age: 3,
  gender: 'male',
  status: 'available',
  rescueId: 'rescue_456'
});

// Advanced configuration
const service = new PetsService({
  apiUrl: 'https://api.example.com',
  timeout: 10000,
  retries: 3,
  debug: true
});
```

## 🔧 Configuration

### PetsServiceConfig

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

### PetsService

#### Core Pet Operations

##### `getAllPets(filters?, options?)`

Get all pets with optional filtering and pagination.

```typescript
const pets = await petsService.getAllPets({
  status: 'available',
  species: 'dog',
  breed: 'Golden Retriever',
  ageMin: 1,
  ageMax: 5,
  gender: 'male',
  size: 'medium',
  rescueId: 'rescue_123',
  location: {
    city: 'San Francisco',
    state: 'CA',
    radius: 50
  }
}, {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

##### `getPetById(petId, options?)`

Get a specific pet by ID.

```typescript
const pet = await petsService.getPetById('pet_123', {
  includeMedia: true,
  includeMedical: true,
  includeApplications: false
});
```

##### `createPet(petData)`

Create a new pet profile.

```typescript
const pet = await petsService.createPet({
  name: 'Luna',
  species: 'cat',
  breed: 'Maine Coon',
  age: 2,
  gender: 'female',
  size: 'large',
  weight: 12.5,
  color: 'gray and white',
  description: 'Friendly and playful cat looking for a loving home',
  status: 'available',
  rescueId: 'rescue_456',
  characteristics: {
    goodWithKids: true,
    goodWithPets: true,
    energyLevel: 'medium',
    trainedLevel: 'house-trained',
    specialNeeds: false
  },
  location: {
    city: 'Portland',
    state: 'OR',
    zipCode: '97201'
  }
});
```

##### `updatePet(petId, updates)`

Update an existing pet profile.

```typescript
const updatedPet = await petsService.updatePet('pet_123', {
  status: 'adopted',
  adoptionDate: new Date().toISOString(),
  description: 'Updated description with new information'
});
```

##### `deletePet(petId)`

Delete a pet profile (soft delete).

```typescript
await petsService.deletePet('pet_123');
```

#### Pet Media Management

##### `uploadPetPhoto(petId, photoFile, options?)`

Upload a photo for a pet.

```typescript
const photo = await petsService.uploadPetPhoto('pet_123', photoFile, {
  isPrimary: true,
  caption: 'Buddy playing in the yard',
  tags: ['outdoor', 'playing', 'happy']
});
```

##### `getPetPhotos(petId, options?)`

Get all photos for a pet.

```typescript
const photos = await petsService.getPetPhotos('pet_123', {
  includeMetadata: true,
  sortBy: 'uploadDate'
});
```

##### `updatePetPhoto(petId, photoId, updates)`

Update photo information.

```typescript
await petsService.updatePetPhoto('pet_123', 'photo_456', {
  caption: 'Updated caption',
  isPrimary: false,
  tags: ['indoor', 'portrait']
});
```

##### `deletePetPhoto(petId, photoId)`

Delete a pet photo.

```typescript
await petsService.deletePetPhoto('pet_123', 'photo_456');
```

#### Medical Records

##### `getPetMedicalRecords(petId, options?)`

Get medical records for a pet.

```typescript
const medicalRecords = await petsService.getPetMedicalRecords('pet_123', {
  includeVaccinations: true,
  includeTreatments: true,
  sortBy: 'date'
});
```

##### `addMedicalRecord(petId, record)`

Add a medical record.

```typescript
const record = await petsService.addMedicalRecord('pet_123', {
  type: 'vaccination',
  date: '2024-01-15',
  veterinarian: 'Dr. Smith',
  clinic: 'Happy Pets Veterinary Clinic',
  description: 'Annual vaccinations (DHPP, Rabies)',
  notes: 'Pet responded well, no adverse reactions',
  nextDueDate: '2025-01-15',
  documents: ['vacc_cert_123.pdf']
});
```

##### `updateMedicalRecord(petId, recordId, updates)`

Update a medical record.

```typescript
await petsService.updateMedicalRecord('pet_123', 'record_456', {
  notes: 'Updated notes with additional observations',
  followUpRequired: false
});
```

#### Breed Information

##### `getBreedsBySpecies(species)`

Get available breeds for a species.

```typescript
const dogBreeds = await petsService.getBreedsBySpecies('dog');
const catBreeds = await petsService.getBreedsBySpecies('cat');
```

##### `getBreedInfo(breedId)`

Get detailed breed information.

```typescript
const breedInfo = await petsService.getBreedInfo('golden_retriever');
// Returns: { 
//   name: 'Golden Retriever',
//   size: 'large',
//   temperament: ['friendly', 'intelligent', 'devoted'],
//   exerciseNeeds: 'high',
//   groomingNeeds: 'moderate',
//   lifespan: '10-12 years',
//   commonHealthIssues: ['hip dysplasia', 'eye problems']
// }
```

#### Adoption Management

##### `getPetApplications(petId, options?)`

Get adoption applications for a pet.

```typescript
const applications = await petsService.getPetApplications('pet_123', {
  status: 'pending',
  sortBy: 'submissionDate',
  includeApplicantInfo: true
});
```

##### `updateAdoptionStatus(petId, status, details?)`

Update a pet's adoption status.

```typescript
await petsService.updateAdoptionStatus('pet_123', 'adopted', {
  adopterId: 'user_789',
  adoptionDate: new Date().toISOString(),
  adoptionFee: 250,
  notes: 'Great match! Family has experience with the breed.'
});
```

#### Search and Filtering

##### `searchPets(query, filters?)`

Search pets with text query and filters.

```typescript
const searchResults = await petsService.searchPets('friendly golden retriever', {
  location: {
    city: 'San Francisco',
    radius: 25
  },
  ageMax: 3,
  goodWithKids: true
});
```

##### `getSimilarPets(petId, options?)`

Find pets similar to the specified pet.

```typescript
const similarPets = await petsService.getSimilarPets('pet_123', {
  limit: 5,
  includeAdopted: false,
  similarityFactors: ['breed', 'age', 'size', 'temperament']
});
```

##### `getFeaturedPets(options?)`

Get featured pets for promotion.

```typescript
const featuredPets = await petsService.getFeaturedPets({
  limit: 10,
  rescueId: 'rescue_456'
});
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Pets Context
import { createContext, useContext, useState } from 'react';
import { PetsService } from '@adopt-dont-shop/lib-pets';

const PetsContext = createContext<PetsService | null>(null);

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new PetsService({
    debug: process.env.NODE_ENV === 'development'
  }));

  return (
    <PetsContext.Provider value={service}>
      {children}
    </PetsContext.Provider>
  );
}

export const usePets = () => {
  const service = useContext(PetsContext);
  if (!service) throw new Error('usePets must be used within PetsProvider');
  return service;
};

// Pet Search Hook
export function usePetSearch(filters: any) {
  const service = usePets();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPets = async (newFilters = filters) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await service.getAllPets(newFilters);
      setPets(results.pets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPets();
  }, [JSON.stringify(filters)]);

  return { pets, loading, error, searchPets };
}

// Pet Detail Hook
export function usePet(petId: string) {
  const service = usePets();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const petData = await service.getPetById(petId, {
          includeMedia: true,
          includeMedical: true
        });
        setPet(petData);
      } catch (error) {
        console.error('Error fetching pet:', error);
      } finally {
        setLoading(false);
      }
    };

    if (petId) fetchPet();
  }, [petId]);

  return { pet, loading };
}

// In components
function PetSearchResults() {
  const [filters, setFilters] = useState({
    species: 'dog',
    status: 'available'
  });
  
  const { pets, loading, error, searchPets } = usePetSearch(filters);

  return (
    <div>
      <PetFilters 
        filters={filters} 
        onFiltersChange={setFilters}
      />
      
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      
      <div className="pet-grid">
        {pets.map(pet => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  );
}

function PetProfile({ petId }: { petId: string }) {
  const { pet, loading } = usePet(petId);
  const petsService = usePets();

  const handleAdoptClick = async () => {
    try {
      await petsService.createApplication(petId, applicationData);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!pet) return <div>Pet not found</div>;

  return (
    <div>
      <PetPhotos photos={pet.photos} />
      <PetDetails pet={pet} />
      <PetMedicalInfo records={pet.medicalRecords} />
      <button onClick={handleAdoptClick}>
        Apply for Adoption
      </button>
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/pets.service.ts
import { PetsService } from '@adopt-dont-shop/lib-pets';

export const petsService = new PetsService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In routes
app.get('/api/pets', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      species: req.query.species,
      rescueId: req.query.rescueId,
      ...req.query
    };
    
    const result = await petsService.getAllPets(filters, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

app.post('/api/pets', async (req, res) => {
  try {
    const pet = await petsService.createPet(req.body);
    res.status(201).json(pet);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create pet' });
  }
});

app.put('/api/pets/:id', async (req, res) => {
  try {
    const pet = await petsService.updatePet(req.params.id, req.body);
    res.json(pet);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update pet' });
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Pet CRUD operations
- ✅ Search and filtering
- ✅ Media management
- ✅ Medical records
- ✅ Adoption workflows
- ✅ Breed information
- ✅ Error handling and validation

Run tests:
```bash
npm run test:lib-pets
```

## 🚀 Key Features

### Comprehensive Pet Management
- **Full Lifecycle**: From intake to adoption
- **Rich Profiles**: Detailed pet information and characteristics
- **Media Support**: Photo and video management
- **Medical Tracking**: Comprehensive health records

### Advanced Search & Discovery
- **Multi-Criteria Search**: Species, breed, age, location, characteristics
- **Smart Matching**: AI-powered pet recommendations
- **Geographic Search**: Location-based pet discovery
- **Similar Pets**: Find pets with similar characteristics

### Adoption Workflow
- **Application Management**: Track adoption applications
- **Status Tracking**: Real-time adoption status updates
- **Communication**: Integrated messaging for adoption process
- **Documentation**: Adoption agreements and records

### Data Management
- **Breed Database**: Comprehensive breed information
- **Medical Records**: Vaccination, treatment, and health tracking
- **Photo Management**: Multiple photos with metadata
- **Audit Trail**: Complete history of pet record changes

## 🔧 Troubleshooting

### Common Issues

**Pet photos not uploading**:
- Check file size limits and supported formats
- Verify API endpoint accessibility
- Enable debug mode for detailed error messages

**Search results inconsistent**:
- Verify filter parameters and data types
- Check database indexing for search fields
- Review location-based search radius settings

**Medical records not saving**:
- Validate required fields and data formats
- Check user permissions for medical data
- Verify veterinarian and clinic information

### Debug Mode

```typescript
const pets = new PetsService({
  debug: true // Enables comprehensive API logging
});
```

This library provides comprehensive pet management capabilities optimized for animal rescue organizations with advanced search, medical tracking, and adoption workflow features.
