/**
 * Mock data factories for testing
 * These generate realistic test data for various entities
 */

export type MockPet = {
  petId: string;
  rescueId: string;
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed: string;
  age: number;
  gender: 'male' | 'female';
  size: 'small' | 'medium' | 'large';
  status: 'AVAILABLE' | 'ADOPTED' | 'FOSTER' | 'MEDICAL_HOLD' | 'BEHAVIORAL_HOLD' | 'PENDING' | 'NOT_AVAILABLE';
  description: string;
  medicalHistory: string;
  behaviorNotes: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export const mockPet = (overrides: Partial<MockPet> = {}): MockPet => ({
  petId: `pet-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  name: 'Buddy',
  type: 'dog',
  breed: 'Labrador',
  age: 3,
  gender: 'male',
  size: 'medium',
  status: 'AVAILABLE',
  description: 'Friendly and energetic dog looking for a loving home',
  medicalHistory: 'Vaccinated, neutered',
  behaviorNotes: 'Good with children and other dogs',
  images: ['https://example.com/pet1.jpg'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export type MockApplication = {
  applicationId: string;
  rescueId: string;
  petId: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  status: 'PENDING' | 'REVIEWING' | 'VISITING' | 'DECIDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  stage: 'PENDING' | 'REVIEWING' | 'VISITING' | 'DECIDING' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  submittedAt: string;
  reviewedAt?: string;
  decision?: string;
  decisionNotes?: string;
  pet: {
    name: string;
    type: string;
    breed: string;
  };
  references: {
    veterinarian?: {
      name: string;
      phone: string;
      verified: boolean;
    };
    personal?: {
      name: string;
      phone: string;
      verified: boolean;
    };
  };
  homeVisit?: {
    scheduled: boolean;
    scheduledDate?: string;
    completed: boolean;
    notes?: string;
  };
};

export const mockApplication = (overrides: Partial<MockApplication> = {}): MockApplication => ({
  applicationId: `app-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  petId: 'test-pet-id',
  userId: 'test-user-id',
  applicantName: 'John Doe',
  applicantEmail: 'john@example.com',
  status: 'PENDING',
  stage: 'PENDING',
  priority: 'MEDIUM',
  submittedAt: '2024-01-15T10:00:00Z',
  pet: {
    name: 'Buddy',
    type: 'dog',
    breed: 'Labrador',
  },
  references: {
    veterinarian: {
      name: 'Dr. Smith',
      phone: '555-0100',
      verified: false,
    },
    personal: {
      name: 'Jane Smith',
      phone: '555-0101',
      verified: false,
    },
  },
  homeVisit: {
    scheduled: false,
    completed: false,
  },
  ...overrides,
});

export type MockStaffMember = {
  staffId: string;
  userId: string;
  rescueId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'VOLUNTEER' | 'STAFF' | 'COORDINATOR' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  permissions: string[];
  joinedAt: string;
};

export const mockStaffMember = (overrides: Partial<MockStaffMember> = {}): MockStaffMember => ({
  staffId: `staff-${Math.random().toString(36).substring(7)}`,
  userId: `user-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  firstName: 'Alice',
  lastName: 'Johnson',
  email: 'alice@rescue.org',
  role: 'STAFF',
  status: 'ACTIVE',
  permissions: ['VIEW_PETS', 'CREATE_PETS', 'UPDATE_PETS', 'VIEW_APPLICATIONS', 'REVIEW_APPLICATIONS'],
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export type MockInvitation = {
  invitationId: string;
  rescueId: string;
  email: string;
  role: 'VOLUNTEER' | 'STAFF' | 'COORDINATOR' | 'ADMIN';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  token: string;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
};

export const mockInvitation = (overrides: Partial<MockInvitation> = {}): MockInvitation => ({
  invitationId: `inv-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  email: 'newstaff@rescue.org',
  role: 'STAFF',
  status: 'PENDING',
  token: `token-${Math.random().toString(36).substring(7)}`,
  invitedBy: 'admin-user-id',
  sentAt: '2024-01-10T00:00:00Z',
  expiresAt: '2024-01-17T00:00:00Z',
  ...overrides,
});

export type MockEvent = {
  eventId: string;
  rescueId: string;
  name: string;
  description: string;
  type: 'adoption' | 'fundraising' | 'volunteer' | 'community';
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  location: string;
  isVirtual: boolean;
  capacity?: number;
  attendees: number;
  createdBy: string;
  createdAt: string;
};

export const mockEvent = (overrides: Partial<MockEvent> = {}): MockEvent => ({
  eventId: `event-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  name: 'Adoption Day',
  description: 'Come meet our adoptable pets!',
  type: 'adoption',
  status: 'published',
  startDate: '2024-02-01T10:00:00Z',
  endDate: '2024-02-01T16:00:00Z',
  location: '123 Main St, City, State',
  isVirtual: false,
  capacity: 50,
  attendees: 12,
  createdBy: 'test-user-id',
  createdAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

export type MockConversation = {
  conversationId: string;
  rescueId: string;
  applicationId: string;
  applicantId: string;
  applicantName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: MockMessage[];
};

export type MockMessage = {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  read: boolean;
};

export const mockMessage = (overrides: Partial<MockMessage> = {}): MockMessage => ({
  messageId: `msg-${Math.random().toString(36).substring(7)}`,
  conversationId: 'test-conversation-id',
  senderId: 'test-user-id',
  senderName: 'Test User',
  content: 'Hello, I have a question about the adoption process.',
  sentAt: '2024-01-15T14:30:00Z',
  read: false,
  ...overrides,
});

export const mockConversation = (overrides: Partial<MockConversation> = {}): MockConversation => ({
  conversationId: `conv-${Math.random().toString(36).substring(7)}`,
  rescueId: 'test-rescue-id',
  applicationId: 'test-app-id',
  applicantId: 'test-applicant-id',
  applicantName: 'John Doe',
  lastMessage: 'Hello, I have a question about the adoption process.',
  lastMessageAt: '2024-01-15T14:30:00Z',
  unreadCount: 1,
  messages: [mockMessage()],
  ...overrides,
});

export type MockDashboardData = {
  metrics: {
    totalPets: number;
    adoptions: number;
    pendingApplications: number;
    adoptionRate: number;
  };
  recentActivities: Array<{
    activityId: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  monthlyAdoptions: Array<{
    month: string;
    count: number;
  }>;
  petStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  notifications: Array<{
    notificationId: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    read: boolean;
    timestamp: string;
  }>;
};

export const mockDashboardData = (overrides: Partial<MockDashboardData> = {}): MockDashboardData => ({
  metrics: {
    totalPets: 45,
    adoptions: 23,
    pendingApplications: 8,
    adoptionRate: 51,
  },
  recentActivities: [
    {
      activityId: 'act-1',
      type: 'adoption',
      description: 'Buddy was adopted by John Doe',
      timestamp: '2024-01-15T10:00:00Z',
    },
    {
      activityId: 'act-2',
      type: 'application',
      description: 'New application received for Max',
      timestamp: '2024-01-14T15:30:00Z',
    },
  ],
  monthlyAdoptions: [
    { month: 'Jan', count: 5 },
    { month: 'Feb', count: 7 },
    { month: 'Mar', count: 6 },
    { month: 'Apr', count: 5 },
  ],
  petStatusDistribution: [
    { status: 'AVAILABLE', count: 22 },
    { status: 'ADOPTED', count: 23 },
    { status: 'FOSTER', count: 5 },
    { status: 'PENDING', count: 3 },
  ],
  notifications: [
    {
      notificationId: 'notif-1',
      type: 'info',
      message: 'New application requires review',
      read: false,
      timestamp: '2024-01-15T12:00:00Z',
    },
  ],
  ...overrides,
});

export type MockAnalytics = {
  adoptionTrends: Array<{
    month: string;
    adoptions: number;
    applications: number;
  }>;
  stageDistribution: Array<{
    stage: string;
    count: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  responseTime: {
    average: number;
    median: number;
  };
};

export const mockAnalytics = (overrides: Partial<MockAnalytics> = {}): MockAnalytics => ({
  adoptionTrends: [
    { month: 'Jan', adoptions: 5, applications: 12 },
    { month: 'Feb', adoptions: 7, applications: 15 },
    { month: 'Mar', adoptions: 6, applications: 13 },
  ],
  stageDistribution: [
    { stage: 'PENDING', count: 8 },
    { stage: 'REVIEWING', count: 5 },
    { stage: 'VISITING', count: 3 },
    { stage: 'DECIDING', count: 2 },
  ],
  conversionFunnel: [
    { stage: 'Applications', count: 100, percentage: 100 },
    { stage: 'Reviewed', count: 80, percentage: 80 },
    { stage: 'Home Visit', count: 50, percentage: 50 },
    { stage: 'Approved', count: 35, percentage: 35 },
  ],
  responseTime: {
    average: 24,
    median: 18,
  },
  ...overrides,
});

/**
 * Generate multiple items from a factory
 */
export const generateMultiple = <T>(
  factory: (overrides?: Record<string, unknown>) => T,
  count: number,
  overrides?: Record<string, unknown>
): T[] => {
  return Array.from({ length: count }, () => factory(overrides));
};
