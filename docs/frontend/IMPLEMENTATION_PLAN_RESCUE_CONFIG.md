# Implementation Plan: Rescue Configuration & Application Workflow

## Overview
This document outlines the implementation plan for completing the Immediate and High Priority features for app.rescue as identified in the PRD review.

## Priority 1: Rescue Configuration (Immediate)

### Current State
- Placeholder page exists at `app.rescue/src/pages/RescueSettings.tsx`
- Backend API endpoints exist:
  - `GET /api/v1/rescues/:rescueId` - Get rescue profile
  - `PUT /api/v1/rescues/:rescueId` - Update rescue information

### Required Features (from PRD)
1. **Rescue Profile Management**
   - Basic information (name, type, contact details)
   - Address and location
   - Operating hours
   - Public description

2. **Custom Application Questions**
   - Manage custom questions for adoption applications
   - Question types: text, multiple choice, yes/no
   - Required/optional configuration
   - Question ordering

3. **Adoption Policy Configuration**
   - Adoption requirements
   - Fee structure
   - Home visit policy
   - Reference check requirements

4. **System Preferences**
   - Notification settings
   - Auto-response settings
   - Default application workflow settings

### Implementation Steps

#### Step 1: Create Rescue Settings Service
- File: `app.rescue/src/services/rescueService.ts`
- Functions:
  - `getRescueProfile(rescueId)`
  - `updateRescueProfile(rescueId, data)`
  - `getApplicationQuestions(rescueId)`
  - `updateApplicationQuestions(rescueId, questions)`
  - `getAdoptionPolicies(rescueId)`
  - `updateAdoptionPolicies(rescueId, policies)`

#### Step 2: Create Rescue Settings Components
- `RescueProfileForm.tsx` - Basic rescue information
- `ApplicationQuestionsManager.tsx` - Custom questions editor
- `AdoptionPolicyForm.tsx` - Policy configuration
- `OperatingHoursForm.tsx` - Hours and availability

#### Step 3: Implement Main Settings Page
- Replace placeholder in `RescueSettings.tsx`
- Tab-based interface for different configuration areas
- Permission checks for edit access
- Auto-save functionality

## Priority 2: Application Workflow (High Priority)

### Current State
- Database supports 5-stage workflow: PENDING → REVIEWING → VISITING → DECIDING → RESOLVED
- Types defined in `app.rescue/src/types/applicationStages.ts`
- Current UI uses simplified statuses (submitted, approved, rejected, withdrawn)

### Required Features (from PRD)
1. **Five-Stage Workflow**
   - PENDING: Applications awaiting initial review
   - REVIEWING: Active review with reference checks
   - VISITING: Home visit scheduled/completed
   - DECIDING: Final decision after positive visit
   - RESOLVED: Completed with final outcome

2. **Stage-Based Transitions**
   - Valid transition paths defined
   - Automated transitions based on events
   - Manual override capability
   - Validation rules

3. **Auto-Progression**
   - When home visit completed → move to DECIDING
   - When references verified + review complete → enable VISITING
   - Timeline event tracking

4. **Bulk Operations**
   - Bulk status updates
   - Bulk message sending
   - Bulk home visit scheduling

### Implementation Steps

#### Step 1: Update Application Service
- File: `app.rescue/src/services/applicationService.ts`
- Add functions:
  - `transitionStage(applicationId, newStage, data)`
  - `bulkUpdateStage(applicationIds, newStage, data)`
  - `getValidTransitions(currentStage)`

#### Step 2: Update Application List UI
- Update `ApplicationList.tsx` to show stages
- Add stage-based filters
- Add stage transition buttons
- Update progress indicators

#### Step 3: Implement Stage Transition Logic
- Create `useStageTransitions.ts` hook
- Validate transitions
- Handle auto-progression triggers
- Update timeline events

#### Step 4: Add Bulk Operations
- Bulk selection in application list
- Bulk action dropdown
- Confirmation modals
- Progress tracking

#### Step 5: Update Application Review Modal
- Show current stage prominently
- Display available actions based on stage
- Auto-progress after home visit completion
- Enhanced timeline with stage changes

## Data Models

### Rescue Configuration
```typescript
interface RescueProfile {
  rescue_id: string;
  rescue_name: string;
  rescue_type: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  description: string;
  website?: string;
  operatingHours?: OperatingHours[];
  applicationQuestions?: CustomQuestion[];
  adoptionPolicies?: AdoptionPolicy;
}

interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'yesno';
  required: boolean;
  options?: string[];
  order: number;
  section: string;
}

interface AdoptionPolicy {
  requireHomeVisit: boolean;
  requireReferences: boolean;
  minimumReferenceCount: number;
  adoptionFeeRange: { min: number; max: number };
  requirements: string[];
  policies: string[];
}
```

### Stage Transition
```typescript
interface StageTransition {
  applicationId: string;
  fromStage: ApplicationStage;
  toStage: ApplicationStage;
  triggeredBy: 'manual' | 'automatic';
  reason?: string;
  performedBy: string;
  timestamp: Date;
}
```

## Testing Checklist

### Rescue Configuration
- [ ] Load rescue profile
- [ ] Update rescue basic info
- [ ] Add/edit/remove custom questions
- [ ] Update adoption policies
- [ ] Permission checks work correctly
- [ ] Changes persist across page reload

### Application Workflow
- [ ] Applications display correct stage
- [ ] Stage transitions work correctly
- [ ] Invalid transitions are blocked
- [ ] Auto-progression from home visits works
- [ ] Timeline shows stage changes
- [ ] Bulk operations work
- [ ] Filters by stage work
- [ ] Statistics update correctly

## Timeline
- **Rescue Configuration**: 2-3 hours
- **Application Workflow**: 3-4 hours
- **Testing & Refinement**: 1-2 hours
- **Total**: 6-9 hours

## Dependencies
- Backend API endpoints (already exist)
- Database schema (already supports stages)
- Type definitions (already exist)
- Permission system (already implemented)
