# @adopt-dont-shop/lib-applications

Adoption application management system with workflow automation, application tracking, and comprehensive evaluation tools

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-applications

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-applications": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { ApplicationsService, ApplicationsServiceConfig } from '@adopt-dont-shop/lib-applications';

// Using the singleton instance
import { applicationsService } from '@adopt-dont-shop/lib-applications';

// Basic application operations
const applications = await applicationsService.getAllApplications({ status: 'pending' });
const application = await applicationsService.getApplicationById('app_123');

// Create a new application
const newApplication = await applicationsService.createApplication({
  petId: 'pet_456',
  applicantId: 'user_789',
  applicationData: {
    livingSituation: 'house',
    hasYard: true,
    petExperience: 'intermediate',
    references: [...]
  }
});

// Advanced configuration
const service = new ApplicationsService({
  apiUrl: 'https://api.example.com',
  workflowEnabled: true,
  autoEvaluation: true,
  debug: true
});
```

## 🔧 Configuration

### ApplicationsServiceConfig

| Property              | Type      | Default                    | Description                          |
| --------------------- | --------- | -------------------------- | ------------------------------------ |
| `apiUrl`              | `string`  | `process.env.VITE_API_URL` | Backend API URL                      |
| `workflowEnabled`     | `boolean` | `true`                     | Enable automated workflow processing |
| `autoEvaluation`      | `boolean` | `true`                     | Enable automatic application scoring |
| `notificationEnabled` | `boolean` | `true`                     | Enable status change notifications   |
| `debug`               | `boolean` | `false`                    | Enable debug logging                 |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Workflow
WORKFLOW_ENABLED=true
AUTO_EVALUATION_ENABLED=true

# Development
NODE_ENV=development
```

## 📖 API Reference

### ApplicationsService

#### Core Application Operations

##### `getAllApplications(filters?, options?)`

Get all adoption applications with filtering and pagination.

```typescript
const applications = await applicationsService.getAllApplications(
  {
    status: 'pending',
    petId: 'pet_123',
    rescueId: 'rescue_456',
    applicantId: 'user_789',
    priority: 'high',
    dateRange: {
      start: '2024-01-01',
      end: '2024-03-31',
    },
  },
  {
    page: 1,
    limit: 20,
    sortBy: 'submissionDate',
    sortOrder: 'desc',
    includeApplicant: true,
    includePet: true,
  }
);
```

##### `getApplicationById(applicationId, options?)`

Get a specific application by ID.

```typescript
const application = await applicationsService.getApplicationById('app_123', {
  includeHistory: true,
  includeEvaluation: true,
  includeReferences: true,
  includeDocuments: true,
});
```

##### `createApplication(applicationData)`

Create a new adoption application.

```typescript
const application = await applicationsService.createApplication({
  petId: 'pet_456',
  applicantId: 'user_789',
  applicationData: {
    // Personal Information
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0123',
      dateOfBirth: '1985-06-15',
      occupation: 'Software Engineer',
    },

    // Living Situation
    livingSituation: {
      type: 'house', // 'apartment', 'house', 'condo', 'other'
      ownership: 'own', // 'own', 'rent', 'other'
      hasYard: true,
      yardFenced: true,
      livingSpace: 2000, // square feet
      householdSize: 3,
      hasChildren: true,
      childrenAges: [8, 12],
      hasAllergies: false,
    },

    // Pet Experience
    petExperience: {
      level: 'intermediate', // 'beginner', 'intermediate', 'advanced'
      previousPets: [
        {
          type: 'dog',
          breed: 'Golden Retriever',
          yearsOwned: 8,
          outcome: 'natural-death',
        },
      ],
      currentPets: [],
      vetReference: {
        name: 'Dr. Smith',
        clinic: 'Happy Pets Veterinary',
        phone: '555-0456',
      },
    },

    // Care Plan
    carePlan: {
      dailyExerciseHours: 2,
      aloneTimeHours: 4,
      trainingPlans: ['basic-obedience', 'house-training'],
      budgetMonthly: 200,
      emergencyFund: 2000,
    },

    // References
    references: [
      {
        name: 'Jane Smith',
        relationship: 'friend',
        phone: '555-0789',
        email: 'jane@example.com',
        yearsKnown: 5,
      },
    ],
  },

  // Additional metadata
  source: 'website',
  notes: 'Applicant seems very enthusiastic and prepared',
});
```

##### `updateApplication(applicationId, updates)`

Update an existing application.

```typescript
const updatedApplication = await applicationsService.updateApplication('app_123', {
  status: 'under-review',
  assignedTo: 'counselor_456',
  priority: 'high',
  notes: 'Updated application with additional information',
  internalNotes: 'Strong candidate, fast-track for approval',
});
```

##### `deleteApplication(applicationId)`

Delete an application (soft delete).

```typescript
await applicationsService.deleteApplication('app_123');
```

#### Application Workflow

##### `submitApplication(applicationId, submissionData?)`

Submit an application for review.

```typescript
await applicationsService.submitApplication('app_123', {
  submissionNotes: 'All required documents provided',
  autoAssign: true,
  priority: 'normal',
});
```

##### `reviewApplication(applicationId, reviewData)`

Review and evaluate an application.

```typescript
const review = await applicationsService.reviewApplication('app_123', {
  reviewerId: 'counselor_456',
  status: 'approved', // 'approved', 'rejected', 'needs-info', 'pending'
  score: 85,
  evaluation: {
    livingEnvironment: 9,
    petExperience: 7,
    financialStability: 8,
    compatibility: 9,
    references: 8,
  },
  comments: 'Excellent match! Great living situation and experience level.',
  conditions: [
    'Must complete training course within 30 days',
    'Provide vet records for current pets',
  ],
  recommendedActions: ['schedule-meet-greet', 'verify-references'],
});
```

##### `scheduleInterview(applicationId, interviewData)`

Schedule an interview with the applicant.

```typescript
const interview = await applicationsService.scheduleInterview('app_123', {
  type: 'phone', // 'phone', 'video', 'in-person', 'home-visit'
  scheduledFor: '2024-02-15T14:00:00Z',
  duration: 60, // minutes
  interviewerId: 'counselor_456',
  location: 'Rescue Center - Main Office',
  notes: 'Discuss training plans and meet-and-greet scheduling',
  questions: [
    'Tell us about your pet experience',
    'How will you handle behavioral challenges?',
    'What is your daily routine like?',
  ],
});
```

##### `conductHomeVisit(applicationId, visitData)`

Schedule and conduct a home visit.

```typescript
const homeVisit = await applicationsService.conductHomeVisit('app_123', {
  scheduledFor: '2024-02-20T10:00:00Z',
  visitorId: 'volunteer_789',
  checklist: ['secure-fencing', 'safe-environment', 'adequate-space', 'family-readiness'],
  findings: {
    environment: 'excellent',
    safety: 'good',
    family: 'very-prepared',
  },
  recommendations: ['install baby gate at stairs'],
  approved: true,
});
```

#### Reference Management

##### `checkReferences(applicationId, options?)`

Check and verify applicant references.

```typescript
const referenceResults = await applicationsService.checkReferences('app_123', {
  autoContact: true,
  requireAll: false,
  timeoutDays: 7,
});

// Returns:
// {
//   personal: { contacted: true, response: 'positive', score: 8 },
//   veterinary: { contacted: true, response: 'excellent', score: 9 },
//   employer: { contacted: false, response: null, score: null }
// }
```

##### `addReference(applicationId, referenceData)`

Add a reference to an application.

```typescript
await applicationsService.addReference('app_123', {
  type: 'personal', // 'personal', 'veterinary', 'employer', 'previous-rescue'
  name: 'Bob Johnson',
  relationship: 'neighbor',
  phone: '555-0321',
  email: 'bob@example.com',
  yearsKnown: 3,
  notes: 'Has seen applicant with their previous pets',
});
```

##### `updateReferenceStatus(applicationId, referenceId, status)`

Update the status of a reference check.

```typescript
await applicationsService.updateReferenceStatus('app_123', 'ref_456', {
  status: 'verified',
  response: 'positive',
  score: 8,
  notes: 'Reference confirmed applicant is responsible pet owner',
  contactDate: new Date().toISOString(),
});
```

#### Document Management

##### `uploadDocument(applicationId, documentFile, documentData)`

Upload a document for an application.

```typescript
const document = await applicationsService.uploadDocument('app_123', documentFile, {
  type: 'identification', // 'identification', 'income-proof', 'lease-agreement', 'vet-records'
  name: 'Drivers License',
  required: true,
  verified: false,
});
```

##### `getApplicationDocuments(applicationId, options?)`

Get all documents for an application.

```typescript
const documents = await applicationsService.getApplicationDocuments('app_123', {
  includeRequired: true,
  includeOptional: true,
  verified: null, // true, false, or null for all
});
```

##### `verifyDocument(applicationId, documentId, verificationData)`

Verify an uploaded document.

```typescript
await applicationsService.verifyDocument('app_123', 'doc_456', {
  verified: true,
  verifiedBy: 'admin_789',
  verificationDate: new Date().toISOString(),
  notes: 'Valid state-issued ID confirmed',
});
```

#### Application Analytics

##### `getApplicationMetrics(filters?, options?)`

Get application analytics and metrics.

```typescript
const metrics = await applicationsService.getApplicationMetrics(
  {
    rescueId: 'rescue_123',
    timeframe: 'month',
  },
  {
    includeConversionRates: true,
    includeProcessingTimes: true,
    includeScoring: true,
  }
);

// Returns:
// {
//   totalApplications: 156,
//   approvalRate: 0.68,
//   avgProcessingTime: 5.2, // days
//   avgScore: 7.8,
//   statusBreakdown: {
//     pending: 23,
//     under_review: 45,
//     approved: 67,
//     rejected: 21
//   }
// }
```

##### `getApplicationTrends(options?)`

Get application trends and patterns.

```typescript
const trends = await applicationsService.getApplicationTrends({
  timeframe: 'quarter',
  groupBy: 'week',
  includeSeasonality: true,
});
```

##### `getPerformanceMetrics(reviewerId?, options?)`

Get reviewer performance metrics.

```typescript
const performance = await applicationsService.getPerformanceMetrics('counselor_456', {
  timeframe: 'month',
  includeAccuracy: true,
  includeSpeed: true,
});
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Applications Context
import { createContext, useContext, useState } from 'react';
import { ApplicationsService } from '@adopt-dont-shop/lib-applications';

const ApplicationsContext = createContext<ApplicationsService | null>(null);

export function ApplicationsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new ApplicationsService({
    workflowEnabled: true,
    debug: process.env.NODE_ENV === 'development'
  }));

  return (
    <ApplicationsContext.Provider value={service}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export const useApplications = () => {
  const service = useContext(ApplicationsContext);
  if (!service) throw new Error('useApplications must be used within ApplicationsProvider');
  return service;
};

// Application Form Hook
export function useApplicationForm(petId: string) {
  const service = useApplications();
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitApplication = async (finalData: any) => {
    setIsSubmitting(true);
    try {
      const application = await service.createApplication({
        petId,
        applicantId: getCurrentUserId(),
        applicationData: finalData
      });

      await service.submitApplication(application.id);
      return application;
    } catch (error) {
      console.error('Application submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    isSubmitting,
    submitApplication
  };
}

// Application Status Hook
export function useApplicationStatus(applicationId: string) {
  const service = useApplications();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const app = await service.getApplicationById(applicationId, {
          includeHistory: true,
          includeEvaluation: true
        });
        setApplication(app);
      } catch (error) {
        console.error('Error fetching application:', error);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) fetchApplication();
  }, [applicationId]);

  return { application, loading };
}

// In components
function AdoptionApplicationForm({ petId }: { petId: string }) {
  const {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    isSubmitting,
    submitApplication
  } = useApplicationForm(petId);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleSubmit = async (finalData: any) => {
    try {
      const application = await submitApplication(finalData);
      // Redirect to success page
      router.push(`/applications/${application.id}/success`);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="application-form">
      <ApplicationStepper
        currentStep={currentStep}
        onStepChange={handleStepChange}
      />

      <ApplicationFormStep
        step={currentStep}
        data={formData}
        onChange={setFormData}
        onNext={() => setCurrentStep(currentStep + 1)}
        onPrevious={() => setCurrentStep(currentStep - 1)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

function ApplicationStatusTracker({ applicationId }: { applicationId: string }) {
  const { application, loading } = useApplicationStatus(applicationId);

  if (loading) return <LoadingSpinner />;
  if (!application) return <div>Application not found</div>;

  return (
    <div className="application-status">
      <ApplicationHeader application={application} />
      <ApplicationTimeline history={application.history} />
      <ApplicationDetails application={application} />
      {application.evaluation && (
        <ApplicationEvaluation evaluation={application.evaluation} />
      )}
    </div>
  );
}

function ApplicationReviewDashboard() {
  const service = useApplications();
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({ status: 'pending' });

  useEffect(() => {
    const loadApplications = async () => {
      const result = await service.getAllApplications(filters, {
        includeApplicant: true,
        includePet: true
      });
      setApplications(result.applications);
    };

    loadApplications();
  }, [filters]);

  const handleReview = async (applicationId: string, reviewData: any) => {
    await service.reviewApplication(applicationId, reviewData);
    // Refresh applications list
  };

  return (
    <div className="review-dashboard">
      <ApplicationFilters filters={filters} onChange={setFilters} />
      <ApplicationQueue
        applications={applications}
        onReview={handleReview}
      />
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/applications.service.ts
import { ApplicationsService } from '@adopt-dont-shop/lib-applications';

export const applicationsService = new ApplicationsService({
  apiUrl: process.env.API_URL,
  workflowEnabled: process.env.WORKFLOW_ENABLED === 'true',
  debug: process.env.NODE_ENV === 'development',
});

// In routes
app.get('/api/applications', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      rescueId: req.query.rescueId,
      petId: req.query.petId,
      ...req.query,
    };

    const result = await applicationsService.getAllApplications(filters, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const application = await applicationsService.createApplication(req.body);
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create application' });
  }
});

app.put('/api/applications/:id/review', async (req, res) => {
  try {
    const review = await applicationsService.reviewApplication(req.params.id, {
      ...req.body,
      reviewerId: req.user.id,
    });
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: 'Failed to review application' });
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Application CRUD operations
- ✅ Workflow automation
- ✅ Document management
- ✅ Reference checking
- ✅ Evaluation scoring
- ✅ Analytics and reporting
- ✅ Error handling and validation

Run tests:

```bash
npm run test:lib-applications
```

## 🚀 Key Features

### Comprehensive Application Management

- **Multi-Step Forms**: Progressive application collection
- **Document Upload**: Secure file handling and verification
- **Reference Checking**: Automated reference verification
- **Status Tracking**: Real-time application progress

### Automated Workflow

- **Smart Assignment**: Automatic application routing
- **Evaluation Scoring**: AI-powered compatibility assessment
- **Workflow Automation**: Streamlined review processes
- **Deadline Management**: Automated reminders and escalations

### Advanced Evaluation Tools

- **Scoring Algorithms**: Multi-factor compatibility scoring
- **Interview Scheduling**: Integrated calendar and communication
- **Home Visit Management**: Site visit coordination and reporting
- **Decision Support**: Data-driven approval recommendations

### Analytics & Reporting

- **Performance Metrics**: Approval rates and processing times
- **Trend Analysis**: Application patterns and seasonality
- **Quality Metrics**: Reviewer performance and accuracy
- **Conversion Tracking**: Application-to-adoption success rates

## 🔧 Troubleshooting

### Common Issues

**Application submissions failing**:

- Check required field validation
- Verify document upload limits and formats
- Review form data serialization

**Workflow not progressing**:

- Check workflow configuration and rules
- Verify user permissions and assignments
- Review automated action triggers

**Reference verification issues**:

- Validate contact information format
- Check notification delivery settings
- Review reference response tracking

### Debug Mode

```typescript
const applications = new ApplicationsService({
  debug: true, // Enables detailed workflow logging
});
```

This library provides comprehensive adoption application management with automated workflows, intelligent evaluation, and robust analytics optimized for animal rescue organizations.
