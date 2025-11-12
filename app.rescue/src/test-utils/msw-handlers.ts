import { http, HttpResponse } from 'msw';

// Mock data for rescue app
const mockPets = [
  {
    petId: 'pet1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    ageGroup: 'adult',
    size: 'large',
    gender: 'male',
    status: 'available',
    description: 'Friendly and energetic',
    images: ['image1.jpg'],
  },
  {
    petId: 'pet2',
    name: 'Whiskers',
    type: 'cat',
    breed: 'Persian',
    ageGroup: 'senior',
    size: 'medium',
    gender: 'female',
    status: 'adopted',
    description: 'Calm and affectionate',
    images: ['image2.jpg'],
  },
];

const mockApplications = [
  {
    applicationId: 'app1',
    petId: 'pet1',
    petName: 'Buddy',
    applicantName: 'John Doe',
    applicantEmail: 'john@example.com',
    status: 'pending',
    submittedAt: '2024-01-01T00:00:00Z',
  },
  {
    applicationId: 'app2',
    petId: 'pet2',
    petName: 'Whiskers',
    applicantName: 'Jane Smith',
    applicantEmail: 'jane@example.com',
    status: 'approved',
    submittedAt: '2024-01-02T00:00:00Z',
  },
];

const mockStaff = [
  {
    staffId: 'staff1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@rescue.org',
    role: 'admin',
    status: 'active',
  },
  {
    staffId: 'staff2',
    firstName: 'Mike',
    lastName: 'Williams',
    email: 'mike@rescue.org',
    role: 'coordinator',
    status: 'active',
  },
];

export const mswHandlers = [
  // Pet management endpoints
  http.get('/api/v1/pets', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredPets = mockPets;
    if (status) {
      filteredPets = mockPets.filter(p => p.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        pets: filteredPets,
        pagination: {
          page: 1,
          limit: 10,
          total: filteredPets.length,
          totalPages: 1,
        },
      },
    });
  }),

  http.get('/api/v1/pets/:petId', ({ params }) => {
    const pet = mockPets.find(p => p.petId === params.petId);

    if (!pet) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Pet not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: pet,
    });
  }),

  http.post('/api/v1/pets', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      type: string;
      breed: string;
      ageGroup: string;
      size: string;
      gender: string;
      description: string;
    };

    const newPet = {
      petId: `pet${mockPets.length + 1}`,
      ...body,
      status: 'available',
      images: [],
    };

    return HttpResponse.json({
      success: true,
      message: 'Pet created successfully',
      data: newPet,
    });
  }),

  http.patch('/api/v1/pets/:petId', async ({ params, request }) => {
    const pet = mockPets.find(p => p.petId === params.petId);

    if (!pet) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Pet not found',
        },
        { status: 404 }
      );
    }

    const updates = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      success: true,
      message: 'Pet updated successfully',
      data: { ...pet, ...updates },
    });
  }),

  // Application management endpoints
  http.get('/api/v1/applications', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredApplications = mockApplications;
    if (status) {
      filteredApplications = mockApplications.filter(a => a.status === status);
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

  http.patch('/api/v1/applications/:applicationId/status', async ({ params, request }) => {
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

    const body = (await request.json()) as { status: string };

    return HttpResponse.json({
      success: true,
      message: 'Application status updated successfully',
      data: { ...application, status: body.status },
    });
  }),

  // Staff management endpoints
  http.get('/api/v1/rescue/staff', () => {
    return HttpResponse.json({
      success: true,
      data: {
        staff: mockStaff,
      },
    });
  }),

  http.post('/api/v1/rescue/staff/invite', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      role: string;
    };

    return HttpResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitationId: 'inv123',
        email: body.email,
        role: body.role,
        status: 'pending',
      },
    });
  }),
];
