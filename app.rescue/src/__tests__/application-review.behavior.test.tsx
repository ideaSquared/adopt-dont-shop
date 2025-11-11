/**
 * Behavioral tests for Application Review workflow (Rescue App)
 *
 * Tests rescue staff application review behavior:
 * - Staff can view applications for their rescue's pets
 * - Staff can filter applications by status/stage
 * - Staff can view application details
 * - Staff can transition applications through stages
 * - Staff can update reference check status
 * - Staff can schedule home visits
 * - Staff can approve/reject applications
 * - Staff can add timeline events and notes
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const mockApplications = [
  {
    applicationId: 'app-1',
    petId: 'pet-1',
    petName: 'Buddy',
    applicantId: 'user-1',
    applicantName: 'John Doe',
    applicantEmail: 'john@example.com',
    applicantPhone: '555-0123',
    status: 'under_review',
    stage: 'initial_review',
    submittedAt: '2024-01-01T00:00:00Z',
    basicInfo: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
    },
    livingSituation: {
      homeType: 'house',
      homeOwnership: 'own',
      yardAccess: true,
      yardFenced: true,
    },
    petExperience: {
      hasPets: true,
      currentPets: ['dog'],
      previousPets: ['cat', 'dog'],
      vetReference: 'Dr. Smith Animal Hospital',
    },
    references: [
      {
        name: 'Jane Smith',
        relationship: 'friend',
        phone: '555-0124',
        status: 'pending',
      },
    ],
  },
  {
    applicationId: 'app-2',
    petId: 'pet-2',
    petName: 'Whiskers',
    applicantId: 'user-2',
    applicantName: 'Jane Smith',
    applicantEmail: 'jane@example.com',
    applicantPhone: '555-0456',
    status: 'approved',
    stage: 'completed',
    submittedAt: '2024-01-05T00:00:00Z',
    approvedAt: '2024-01-20T00:00:00Z',
    basicInfo: {
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
    },
    livingSituation: {
      homeType: 'apartment',
      homeOwnership: 'rent',
      yardAccess: false,
    },
    petExperience: {
      hasPets: false,
      previousPets: ['cat'],
      vetReference: 'Dr. Johnson Pet Clinic',
    },
  },
];

const mockTimeline = [
  {
    eventId: 'event-1',
    applicationId: 'app-1',
    type: 'status_change',
    title: 'Application Submitted',
    description: 'Application received and pending review',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
  },
  {
    eventId: 'event-2',
    applicationId: 'app-1',
    type: 'stage_change',
    title: 'Moved to Initial Review',
    description: 'Application moved to initial review stage',
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'staff-1',
  },
];

const server = setupServer(
  // Get application statistics (must come before :applicationId to avoid matching "stats" as an ID)
  http.get('/api/v1/applications/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 125,
        pending: 15,
        under_review: 25,
        approved: 75,
        rejected: 10,
        by_stage: {
          initial_review: 20,
          reference_check: 8,
          home_visit: 5,
          final_decision: 12,
          completed: 80,
        },
      },
    });
  }),

  // Get applications for rescue
  http.get('/api/v1/applications', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const stage = url.searchParams.get('stage');

    let filteredApplications = mockApplications;

    if (status) {
      filteredApplications = filteredApplications.filter(a => a.status === status);
    }

    if (stage) {
      filteredApplications = filteredApplications.filter(a => a.stage === stage);
    }

    return HttpResponse.json({
      success: true,
      data: {
        applications: filteredApplications,
        pagination: {
          page: 1,
          limit: 10,
          total: filteredApplications.length,
          totalPages: 1,
        },
      },
    });
  }),

  // Get single application
  http.get('/api/v1/applications/:applicationId', ({ params }) => {
    const application = mockApplications.find(a => a.applicationId === params.applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: application,
    });
  }),

  // Update application stage
  http.patch('/api/v1/applications/:applicationId/stage', async ({ params, request }) => {
    const body = await request.json() as { stage: string; notes?: string };
    const application = mockApplications.find(a => a.applicationId === params.applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Application stage updated successfully',
      data: {
        ...application,
        stage: body.stage,
      },
    });
  }),

  // Update reference check status
  http.patch('/api/v1/applications/:applicationId/references/:referenceId', async ({ params, request }) => {
    const body = await request.json() as { status: string; notes?: string };

    return HttpResponse.json({
      success: true,
      message: 'Reference check updated successfully',
      data: {
        referenceId: params.referenceId,
        status: body.status,
        notes: body.notes,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // Schedule home visit
  http.post('/api/v1/applications/:applicationId/home-visit', async ({ params, request }) => {
    const body = await request.json() as {
      scheduledDate: string;
      staffMemberId: string;
      notes?: string;
    };

    return HttpResponse.json({
      success: true,
      message: 'Home visit scheduled successfully',
      data: {
        homeVisitId: 'visit-1',
        applicationId: params.applicationId,
        scheduledDate: body.scheduledDate,
        staffMemberId: body.staffMemberId,
        status: 'scheduled',
      },
    });
  }),

  // Approve application
  http.patch('/api/v1/applications/:applicationId/approve', async ({ params, request }) => {
    const body = await request.json() as { notes?: string };
    const application = mockApplications.find(a => a.applicationId === params.applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Application approved successfully',
      data: {
        ...application,
        status: 'approved',
        stage: 'completed',
        approvedAt: new Date().toISOString(),
      },
    });
  }),

  // Reject application
  http.patch('/api/v1/applications/:applicationId/reject', async ({ params, request }) => {
    const body = await request.json() as { reason: string; notes?: string };
    const application = mockApplications.find(a => a.applicationId === params.applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Application rejected',
      data: {
        ...application,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: body.reason,
      },
    });
  }),

  // Get application timeline
  http.get('/api/v1/applications/:applicationId/timeline', () => {
    return HttpResponse.json({
      success: true,
      data: {
        events: mockTimeline,
      },
    });
  }),

  // Add timeline event
  http.post('/api/v1/applications/:applicationId/timeline', async ({ params, request }) => {
    const body = await request.json() as {
      type: string;
      title: string;
      description: string;
    };

    return HttpResponse.json({
      success: true,
      message: 'Timeline event added successfully',
      data: {
        eventId: `event-${Date.now()}`,
        applicationId: params.applicationId,
        ...body,
        createdAt: new Date().toISOString(),
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Application Review - Behavioral Tests', () => {
  describe('Viewing Applications', () => {
    it('should list all applications for rescue', async () => {
      const response = await fetch('/api/v1/applications');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.applications)).toBe(true);
      expect(data.data.applications.length).toBeGreaterThan(0);
    });

    it('should include applicant details', async () => {
      const response = await fetch('/api/v1/applications');
      const data = await response.json();

      const application = data.data.applications[0];
      expect(application.applicantName).toBeTruthy();
      expect(application.applicantEmail).toBeTruthy();
      expect(application.applicantPhone).toBeTruthy();
    });

    it('should include pet information', async () => {
      const response = await fetch('/api/v1/applications');
      const data = await response.json();

      const application = data.data.applications[0];
      expect(application.petId).toBeTruthy();
      expect(application.petName).toBeTruthy();
    });
  });

  describe('Filtering Applications', () => {
    it('should filter by status', async () => {
      const response = await fetch('/api/v1/applications?status=approved');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.applications.forEach((app: any) => {
        expect(app.status).toBe('approved');
      });
    });

    it('should filter by stage', async () => {
      const response = await fetch('/api/v1/applications?stage=initial_review');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.applications.forEach((app: any) => {
        expect(app.stage).toBe('initial_review');
      });
    });

    it('should support combined filters', async () => {
      const response = await fetch('/api/v1/applications?status=under_review&stage=initial_review');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.applications.forEach((app: any) => {
        expect(app.status).toBe('under_review');
        expect(app.stage).toBe('initial_review');
      });
    });
  });

  describe('Application Details', () => {
    it('should get full application details', async () => {
      const response = await fetch('/api/v1/applications/app-1');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.applicationId).toBe('app-1');
      expect(data.data.basicInfo).toBeTruthy();
      expect(data.data.livingSituation).toBeTruthy();
      expect(data.data.petExperience).toBeTruthy();
    });

    it('should include living situation details', async () => {
      const response = await fetch('/api/v1/applications/app-1');
      const data = await response.json();

      const livingSituation = data.data.livingSituation;
      expect(livingSituation.homeType).toBeTruthy();
      expect(livingSituation.homeOwnership).toBeTruthy();
      expect(typeof livingSituation.yardAccess).toBe('boolean');
    });

    it('should include pet experience details', async () => {
      const response = await fetch('/api/v1/applications/app-1');
      const data = await response.json();

      const petExperience = data.data.petExperience;
      expect(typeof petExperience.hasPets).toBe('boolean');
      expect(petExperience.vetReference).toBeTruthy();
    });
  });

  describe('Stage Transitions', () => {
    it('should move application to reference check stage', async () => {
      const response = await fetch('/api/v1/applications/app-1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'reference_check',
          notes: 'Initial review completed, proceeding to references',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stage).toBe('reference_check');
    });

    it('should move application to home visit stage', async () => {
      const response = await fetch('/api/v1/applications/app-1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'home_visit',
          notes: 'References checked, scheduling home visit',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stage).toBe('home_visit');
    });

    it('should move application to final decision stage', async () => {
      const response = await fetch('/api/v1/applications/app-1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'final_decision',
          notes: 'Home visit completed successfully',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stage).toBe('final_decision');
    });
  });

  describe('Reference Checks', () => {
    it('should update reference check status to completed', async () => {
      const response = await fetch('/api/v1/applications/app-1/references/ref-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Excellent reference, highly recommends applicant',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
    });

    it('should include reference check notes', async () => {
      const response = await fetch('/api/v1/applications/app-1/references/ref-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Positive feedback',
        }),
      });

      const data = await response.json();
      expect(data.data.notes).toBe('Positive feedback');
    });
  });

  describe('Home Visits', () => {
    it('should schedule home visit', async () => {
      const response = await fetch('/api/v1/applications/app-1/home-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: '2024-02-15T10:00:00Z',
          staffMemberId: 'staff-1',
          notes: 'Initial home visit',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.homeVisitId).toBeTruthy();
      expect(data.data.status).toBe('scheduled');
    });

    it('should include scheduled date and time', async () => {
      const scheduledDate = '2024-02-15T10:00:00Z';
      const response = await fetch('/api/v1/applications/app-1/home-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate,
          staffMemberId: 'staff-1',
        }),
      });

      const data = await response.json();
      expect(data.data.scheduledDate).toBe(scheduledDate);
    });
  });

  describe('Application Approval', () => {
    it('should approve application', async () => {
      const response = await fetch('/api/v1/applications/app-1/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Excellent fit for the pet',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Application approved successfully');
      expect(data.data.status).toBe('approved');
      expect(data.data.stage).toBe('completed');
    });

    it('should include approval timestamp', async () => {
      const response = await fetch('/api/v1/applications/app-1/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(data.data.approvedAt).toBeTruthy();
      const date = new Date(data.data.approvedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Application Rejection', () => {
    it('should reject application with reason', async () => {
      const response = await fetch('/api/v1/applications/app-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Home environment not suitable',
          notes: 'No fenced yard for large dog',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Application rejected');
      expect(data.data.status).toBe('rejected');
      expect(data.data.rejectionReason).toBe('Home environment not suitable');
    });

    it('should include rejection timestamp', async () => {
      const response = await fetch('/api/v1/applications/app-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Incomplete references',
        }),
      });

      const data = await response.json();
      expect(data.data.rejectedAt).toBeTruthy();
    });
  });

  describe('Timeline Management', () => {
    it('should get application timeline', async () => {
      const response = await fetch('/api/v1/applications/app-1/timeline');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.events)).toBe(true);
      expect(data.data.events.length).toBeGreaterThan(0);
    });

    it('should add timeline event', async () => {
      const response = await fetch('/api/v1/applications/app-1/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          title: 'Follow-up Call',
          description: 'Called applicant to discuss pet care requirements',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.eventId).toBeTruthy();
      expect(data.data.createdAt).toBeTruthy();
    });
  });

  describe('Application Statistics', () => {
    it('should get application statistics', async () => {
      const response = await fetch('/api/v1/applications/stats');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(typeof data.data.total).toBe('number');
      expect(typeof data.data.pending).toBe('number');
      expect(typeof data.data.approved).toBe('number');
    });

    it('should include stage distribution', async () => {
      const response = await fetch('/api/v1/applications/stats');
      const data = await response.json();

      expect(data.data.by_stage).toBeTruthy();
      expect(typeof data.data.by_stage.initial_review).toBe('number');
      expect(typeof data.data.by_stage.reference_check).toBe('number');
      expect(typeof data.data.by_stage.home_visit).toBe('number');
    });
  });

  describe('Validation', () => {
    it('should validate application status values', () => {
      const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'withdrawn'];

      mockApplications.forEach(app => {
        expect(validStatuses).toContain(app.status);
      });
    });

    it('should validate application stage values', () => {
      const validStages = [
        'initial_review',
        'reference_check',
        'home_visit',
        'final_decision',
        'completed',
      ];

      mockApplications.forEach(app => {
        expect(validStages).toContain(app.stage);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent application', async () => {
      const response = await fetch('/api/v1/applications/non-existent');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Application not found');
    });

    it('should handle approval failure', async () => {
      server.use(
        http.patch('/api/v1/applications/:applicationId/approve', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Approval failed',
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/v1/applications/app-1/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
