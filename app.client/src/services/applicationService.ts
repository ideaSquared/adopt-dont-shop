import { Application, ApplicationData, ApplicationStatus } from '@/types';
import { api } from './api';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

interface ApplicationWithPetInfo extends Application {
  petName?: string;
  petType?: string;
  petBreed?: string;
}

interface ApplicationSubmission {
  pet_id: string;
  answers: {
    personal_info: Record<string, unknown>;
    living_situation: Record<string, unknown>;
    pet_experience: Record<string, unknown>;
    additional_info: Record<string, unknown>;
  };
  references?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  priority?: string;
}

export class ApplicationService {
  private baseUrl = '/api/v1/applications';

  async submitApplication(applicationData: ApplicationSubmission): Promise<Application> {
    const response = await api.post<{
      application_id: string;
      user_id: string;
      pet_id: string;
      rescue_id: string;
      status: string;
      submitted_at: string;
      created_at: string;
      updated_at: string;
      [key: string]: unknown;
    }>(`${this.baseUrl}`, applicationData);

    return {
      id: response.application_id,
      petId: response.pet_id,
      userId: response.user_id,
      rescueId: response.rescue_id,
      status: response.status as ApplicationStatus,
      submittedAt: response.submitted_at,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
      data: {
        petId: response.pet_id,
        userId: response.user_id,
        rescueId: response.rescue_id,
        personalInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          county: '',
          postcode: '',
          country: '',
        },
        livingsituation: {
          housingType: 'house' as const,
          isOwned: false,
          hasYard: false,
          allowsPets: false,
          householdSize: 1,
          hasAllergies: false,
        },
        petExperience: {
          hasPetsCurrently: false,
          experienceLevel: 'beginner' as const,
          willingToTrain: false,
          hoursAloneDaily: 0,
          exercisePlans: '',
        },
        references: {
          personal: [],
        },
      } as ApplicationData,
      documents: [],
      reviewedAt: '',
      reviewedBy: '',
      reviewNotes: '',
    } as Application;
  }

  async updateApplication(
    applicationId: string,
    applicationData: Partial<ApplicationData>
  ): Promise<Application> {
    const response = await api.put<ApiResponse<Application>>(
      `${this.baseUrl}/${applicationId}`,
      applicationData
    );
    return response.data;
  }

  async getApplicationById(applicationId: string): Promise<Application> {
    const response = await api.get<{
      success: boolean;
      data: Record<string, unknown>;
    }>(`${this.baseUrl}/${applicationId}`);

    let applicationData: Record<string, unknown>;
    if (response && typeof response === 'object' && 'data' in response) {
      applicationData = response.data as Record<string, unknown>;
    } else {
      applicationData = response as Record<string, unknown>;
    }

    const application: ApplicationWithPetInfo = {
      id: applicationData.application_id as string,
      petId: applicationData.pet_id as string,
      userId: applicationData.user_id as string,
      rescueId: applicationData.rescue_id as string,
      status: applicationData.status as ApplicationStatus,
      submittedAt: applicationData.submitted_at as string,
      reviewedAt: applicationData.reviewed_at as string,
      reviewedBy: applicationData.actioned_by as string,
      reviewNotes: applicationData.notes as string,
      createdAt: applicationData.created_at as string,
      updatedAt: applicationData.updated_at as string,
      data: {
        answers: (applicationData.answers as Record<string, unknown>) || {},
        references: {
          personal: (applicationData.references as unknown[]) || [],
        },
        documents: (applicationData.documents as unknown[]) || [],
      } as unknown as ApplicationData,
      documents: [],
    };

    const petData = applicationData.Pet as Record<string, unknown> | undefined;
    if (petData) {
      application.petName = petData.name as string;
      application.petType = petData.type as string;
      application.petBreed = petData.breed as string;
    }

    return application;
  }

  async getApplicationByPetId(petId: string): Promise<Application | null> {
    const response = await api.get<{
      success: boolean;
      data: Application[];
    }>(this.baseUrl, { pet_id: petId });

    const responseData = response as unknown as {
      data: {
        success: boolean;
        data: Application[];
      };
    };

    let applications: Application[] = [];
    if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
      applications = responseData.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      applications = response.data;
    } else if (Array.isArray(response)) {
      applications = response;
    }

    return applications.length > 0 ? applications[0] : null;
  }

  async getUserApplications(userId?: string): Promise<Application[]> {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get<{
      success: boolean;
      data: Record<string, unknown>[];
    }>(this.baseUrl, params);

    let applicationsData: Record<string, unknown>[] = [];
    if (Array.isArray(response)) {
      applicationsData = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      applicationsData = response.data;
    }

    const applications: ApplicationWithPetInfo[] = applicationsData.map(app => {
      const baseApplication: ApplicationWithPetInfo = {
        id: app.application_id as string,
        petId: app.pet_id as string,
        userId: app.user_id as string,
        rescueId: app.rescue_id as string,
        status: app.status as ApplicationStatus,
        submittedAt: app.submitted_at as string,
        reviewedAt: app.reviewed_at as string,
        reviewedBy: app.actioned_by as string,
        reviewNotes: app.notes as string,
        createdAt: app.created_at as string,
        updatedAt: app.updated_at as string,
        data: {
          answers: (app.answers as Record<string, unknown>) || {},
          references: {
            personal: (app.references as unknown[]) || [],
          },
          documents: (app.documents as unknown[]) || [],
        } as unknown as ApplicationData,
        documents: [],
      };

      const petData = app.Pet as Record<string, unknown> | undefined;
      if (petData) {
        baseApplication.petName = petData.name as string;
        baseApplication.petType = petData.type as string;
        baseApplication.petBreed = petData.breed as string;
      }

      return baseApplication;
    });

    return applications;
  }

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<Application> {
    const response = await api.patch<ApiResponse<Application>>(
      `${this.baseUrl}/${applicationId}/status`,
      { status, notes }
    );
    return response.data;
  }

  async withdrawApplication(applicationId: string, reason?: string): Promise<Application> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Record<string, unknown>;
    }>(`${this.baseUrl}/${applicationId}/withdraw`, { reason });

    // Transform the API response to match frontend Application interface
    const applicationData = response.data;

    return {
      id: applicationData.application_id as string,
      petId: applicationData.pet_id as string,
      userId: applicationData.user_id as string,
      rescueId: applicationData.rescue_id as string,
      status: applicationData.status as ApplicationStatus,
      submittedAt: applicationData.submitted_at as string,
      reviewedAt: applicationData.reviewed_at as string,
      reviewedBy: applicationData.actioned_by as string,
      reviewNotes: applicationData.notes as string,
      createdAt: applicationData.created_at as string,
      updatedAt: applicationData.updated_at as string,
      data: {
        answers: (applicationData.answers as Record<string, unknown>) || {},
        references: {
          personal: (applicationData.references as unknown[]) || [],
        },
        documents: (applicationData.documents as unknown[]) || [],
      } as unknown as ApplicationData,
      documents: [],
    } as Application;
  }
}

export const applicationService = new ApplicationService();
