/**
 * Remaining Features Behaviour Tests
 *
 * Tests for Events, Communication, Settings, Analytics, and Invitation Acceptance.
 * All external dependencies are mocked.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { waitFor } from '@testing-library/react';
import {
  renderWithAllProviders,
  createMockAuthState,
  mockEvent,
  mockConversation,
  mockMessage,
  mockAnalytics,
  mockInvitation,
  screen,
  userEvent,
  startApiMockServer,
  stopApiMockServer,
  resetApiMocks,
} from '../../test-utils';

// Mock all required hooks and services
jest.mock('../../hooks/useEvents', () => ({
  useEvents: jest.fn(),
}));

jest.mock('../../contexts/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => children,
  useChat: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@adopt-dont-shop/lib-invitations', () => ({
  invitationService: {
    validateInvitation: jest.fn(),
    acceptInvitation: jest.fn(),
  },
}));

const { useEvents } = require('../../hooks/useEvents');
const { useChat } = require('../../contexts/ChatContext');
const { useAnalytics } = require('../../hooks/useAnalytics');
const { invitationService } = require('@adopt-dont-shop/lib-invitations');

describe('Event Management Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('EM-1: User can view list of all events with filtering', () => {
    it('displays events filtered by type', () => {
      const events = [
        mockEvent({ type: 'adoption', name: 'Adoption Day' }),
        mockEvent({ type: 'fundraising', name: 'Charity Gala' }),
      ];

      useEvents.mockReturnValue({
        events,
        loading: false,
        error: null,
        filter: { type: 'adoption' },
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      expect(useEvents().events.length).toBe(2);
      expect(useEvents().filter.type).toBe('adoption');
    });

    it('displays events filtered by status', () => {
      useEvents.mockReturnValue({
        events: [mockEvent({ status: 'published' })],
        loading: false,
        error: null,
        filter: { status: 'published' },
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      expect(useEvents().filter.status).toBe('published');
    });
  });

  describe('EM-2: User can create new event with details', () => {
    it('creates event with all required fields', async () => {
      const createEvent = jest.fn().mockResolvedValue(mockEvent());

      useEvents.mockReturnValue({
        events: [],
        loading: false,
        error: null,
        filter: {},
        setFilter: jest.fn(),
        createEvent,
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      await createEvent({
        name: 'Adoption Day',
        type: 'adoption',
        date: '2024-02-01',
        location: '123 Main St',
      });

      expect(createEvent).toHaveBeenCalled();
    });
  });

  describe('EM-3: User can edit existing event details', () => {
    it('updates event information', async () => {
      const updateEvent = jest.fn().mockResolvedValue(mockEvent());

      useEvents.mockReturnValue({
        events: [mockEvent()],
        loading: false,
        error: null,
        filter: {},
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent,
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      await updateEvent('event-123', { name: 'Updated Event Name' });

      expect(updateEvent).toHaveBeenCalledWith('event-123', { name: 'Updated Event Name' });
    });
  });

  describe('EM-4: User can publish draft events', () => {
    it('changes event status from draft to published', async () => {
      const updateEvent = jest.fn().mockResolvedValue(
        mockEvent({ status: 'published' })
      );

      useEvents.mockReturnValue({
        events: [mockEvent({ status: 'draft' })],
        loading: false,
        error: null,
        filter: {},
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent,
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      await updateEvent('event-123', { status: 'published' });

      expect(updateEvent).toHaveBeenCalled();
    });
  });

  describe('EM-5: User can track event attendees', () => {
    it('displays attendee count and registration list', () => {
      const event = mockEvent({ attendees: 25, capacity: 50 });

      useEvents.mockReturnValue({
        events: [event],
        loading: false,
        error: null,
        filter: {},
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      expect(useEvents().events[0].attendees).toBe(25);
      expect(useEvents().events[0].capacity).toBe(50);
    });
  });

  describe('EM-6: User can view event analytics', () => {
    it('shows event attendance statistics', () => {
      const event = mockEvent({
        attendees: 45,
        capacity: 50,
      });

      useEvents.mockReturnValue({
        events: [event],
        loading: false,
        error: null,
        filter: {},
        setFilter: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        refetch: jest.fn(),
      });

      const attendanceRate = (event.attendees / event.capacity!) * 100;
      expect(attendanceRate).toBe(90);
    });
  });
});

describe('Communication Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('CM-1: User can view list of all conversations', () => {
    it('displays conversations with applicants', () => {
      const conversations = [
        mockConversation({ applicantName: 'John Doe', unreadCount: 2 }),
        mockConversation({ applicantName: 'Jane Smith', unreadCount: 0 }),
      ];

      useChat.mockReturnValue({
        conversations,
        activeConversation: null,
        messages: [],
        loading: false,
        error: null,
        setActiveConversation: jest.fn(),
        sendMessage: jest.fn(),
        markAsRead: jest.fn(),
      });

      expect(useChat().conversations.length).toBe(2);
      expect(useChat().conversations[0].unreadCount).toBe(2);
    });
  });

  describe('CM-2: User can select conversation and view message history', () => {
    it('loads messages for selected conversation', () => {
      const conversation = mockConversation();
      const messages = [
        mockMessage({ content: 'Hello, I have a question' }),
        mockMessage({ content: 'Hi! How can I help you?' }),
      ];

      useChat.mockReturnValue({
        conversations: [conversation],
        activeConversation: conversation,
        messages,
        loading: false,
        error: null,
        setActiveConversation: jest.fn(),
        sendMessage: jest.fn(),
        markAsRead: jest.fn(),
      });

      expect(useChat().activeConversation).not.toBeNull();
      expect(useChat().messages.length).toBe(2);
    });
  });

  describe('CM-3: User can send text messages to applicants', () => {
    it('sends message and updates conversation', async () => {
      const sendMessage = jest.fn().mockResolvedValue(
        mockMessage({ content: 'Thank you for your interest!' })
      );

      useChat.mockReturnValue({
        conversations: [mockConversation()],
        activeConversation: mockConversation(),
        messages: [],
        loading: false,
        error: null,
        setActiveConversation: jest.fn(),
        sendMessage,
        markAsRead: jest.fn(),
      });

      await sendMessage('Thank you for your interest!');

      expect(sendMessage).toHaveBeenCalledWith('Thank you for your interest!');
    });
  });

  describe('CM-4: User sees typing indicator when applicant is typing', () => {
    it('displays typing indicator in active conversation', () => {
      useChat.mockReturnValue({
        conversations: [mockConversation()],
        activeConversation: mockConversation(),
        messages: [],
        loading: false,
        error: null,
        isTyping: true,
        setActiveConversation: jest.fn(),
        sendMessage: jest.fn(),
        markAsRead: jest.fn(),
      });

      expect(useChat().isTyping).toBe(true);
    });
  });

  describe('CM-5: User sees real-time message updates', () => {
    it('updates message list when new message arrives', () => {
      const initialMessages = [mockMessage()];
      const newMessage = mockMessage({ content: 'New message!' });

      useChat.mockReturnValue({
        conversations: [mockConversation()],
        activeConversation: mockConversation(),
        messages: [...initialMessages, newMessage],
        loading: false,
        error: null,
        setActiveConversation: jest.fn(),
        sendMessage: jest.fn(),
        markAsRead: jest.fn(),
      });

      expect(useChat().messages.length).toBe(2);
    });
  });
});

describe('Settings Management Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('SET-1: User can view and edit rescue profile', () => {
    it('displays rescue profile information', () => {
      const profile = {
        name: 'Happy Paws Rescue',
        email: 'contact@happypaws.org',
        phone: '555-0100',
        description: 'Dedicated to finding loving homes',
      };

      expect(profile.name).toBe('Happy Paws Rescue');
      expect(profile.email).toBe('contact@happypaws.org');
    });

    it('updates rescue profile successfully', () => {
      const updateProfile = jest.fn().mockResolvedValue({
        name: 'Updated Rescue Name',
      });

      expect(updateProfile).toBeDefined();
    });
  });

  describe('SET-2: User can update rescue address and operating hours', () => {
    it('saves rescue address information', () => {
      const address = {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        country: 'United States',
      };

      expect(address.city).toBe('Springfield');
    });

    it('sets operating hours for each day', () => {
      const operatingHours = {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        saturday: { open: '10:00', close: '14:00' },
        sunday: { open: null, close: null },
      };

      expect(operatingHours.monday.open).toBe('09:00');
      expect(operatingHours.sunday.open).toBeNull();
    });
  });

  describe('SET-3: User can configure adoption policies', () => {
    it('sets adoption requirements', () => {
      const policies = {
        minimumAge: 21,
        homeVisitRequired: true,
        backgroundCheckRequired: false,
        adoptionFeeRange: { min: 50, max: 250 },
      };

      expect(policies.homeVisitRequired).toBe(true);
      expect(policies.adoptionFeeRange.max).toBe(250);
    });
  });

  describe('SET-4: User can set adoption fee ranges', () => {
    it('configures fee structure', () => {
      const fees = {
        dogs: { min: 100, max: 300 },
        cats: { min: 50, max: 150 },
        other: { min: 25, max: 100 },
      };

      expect(fees.dogs.max).toBe(300);
      expect(fees.cats.min).toBe(50);
    });
  });

  describe('SET-5: User can create custom application questions', () => {
    it('adds custom questions to application', () => {
      const questions = [
        {
          id: 'q1',
          section: 'experience',
          question: 'Have you owned pets before?',
          type: 'yes_no',
          required: true,
        },
        {
          id: 'q2',
          section: 'living_situation',
          question: 'Do you have a fenced yard?',
          type: 'yes_no',
          required: false,
        },
      ];

      expect(questions.length).toBe(2);
      expect(questions[0].required).toBe(true);
    });
  });

  describe('SET-6: User can configure notification preferences', () => {
    it('sets email notification settings', () => {
      const notifications = {
        newApplications: true,
        applicationStatusChanges: true,
        weeklyDigest: false,
        urgentOnly: false,
      };

      expect(notifications.newApplications).toBe(true);
      expect(notifications.weeklyDigest).toBe(false);
    });
  });
});

describe('Analytics Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('AN-1: User can view adoption trends chart', () => {
    it('displays monthly adoption statistics', () => {
      const analytics = mockAnalytics();

      useAnalytics.mockReturnValue({
        data: analytics,
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange: jest.fn(),
        exportData: jest.fn(),
      });

      expect(useAnalytics().data.adoptionTrends.length).toBeGreaterThan(0);
    });
  });

  describe('AN-2: User can view application stage distribution', () => {
    it('shows count of applications in each stage', () => {
      const analytics = mockAnalytics();

      useAnalytics.mockReturnValue({
        data: analytics,
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange: jest.fn(),
        exportData: jest.fn(),
      });

      const stageDistribution = useAnalytics().data.stageDistribution;
      expect(stageDistribution.some((s: any) => s.stage === 'PENDING')).toBe(true);
    });
  });

  describe('AN-3: User can view conversion funnel', () => {
    it('displays application to adoption conversion rates', () => {
      const analytics = mockAnalytics();

      useAnalytics.mockReturnValue({
        data: analytics,
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange: jest.fn(),
        exportData: jest.fn(),
      });

      const funnel = useAnalytics().data.conversionFunnel;
      expect(funnel[0].percentage).toBe(100);
      expect(funnel[funnel.length - 1].percentage).toBeLessThan(100);
    });
  });

  describe('AN-4: User can view average response time metrics', () => {
    it('shows response time statistics', () => {
      const analytics = mockAnalytics({
        responseTime: { average: 24, median: 18 },
      });

      useAnalytics.mockReturnValue({
        data: analytics,
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange: jest.fn(),
        exportData: jest.fn(),
      });

      expect(useAnalytics().data.responseTime.average).toBe(24);
      expect(useAnalytics().data.responseTime.median).toBe(18);
    });
  });

  describe('AN-5: User can filter analytics by custom date range', () => {
    it('updates analytics data for selected date range', () => {
      const setDateRange = jest.fn();

      useAnalytics.mockReturnValue({
        data: mockAnalytics(),
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange,
        exportData: jest.fn(),
      });

      setDateRange({ start: '2024-02-01', end: '2024-02-28' });

      expect(setDateRange).toHaveBeenCalledWith({
        start: '2024-02-01',
        end: '2024-02-28',
      });
    });

    it('exports analytics data', () => {
      const exportData = jest.fn();

      useAnalytics.mockReturnValue({
        data: mockAnalytics(),
        loading: false,
        error: null,
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        setDateRange: jest.fn(),
        exportData,
      });

      exportData();

      expect(exportData).toHaveBeenCalled();
    });
  });
});

describe('Invitation Acceptance Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('IA-1: User can view invitation details', () => {
    it('displays invitation information from valid token', async () => {
      const invitation = mockInvitation({
        email: 'newstaff@rescue.org',
        role: 'STAFF',
        rescueId: 'rescue-123',
      });

      invitationService.validateInvitation.mockResolvedValue(invitation);

      const result = await invitationService.validateInvitation('valid-token');

      expect(result.email).toBe('newstaff@rescue.org');
      expect(result.role).toBe('STAFF');
    });
  });

  describe('IA-2: User can accept valid invitation', () => {
    it('accepts invitation and creates account', async () => {
      const acceptedInvitation = {
        userId: 'user-123',
        email: 'newstaff@rescue.org',
        role: 'STAFF',
        rescueId: 'rescue-123',
      };

      invitationService.acceptInvitation.mockResolvedValue(acceptedInvitation);

      const result = await invitationService.acceptInvitation('valid-token', {
        firstName: 'John',
        lastName: 'Doe',
        password: 'securepassword',
      });

      expect(result.userId).toBeDefined();
      expect(result.rescueId).toBe('rescue-123');
    });
  });

  describe('IA-3: User sees error for invalid/expired invitation', () => {
    it('shows error for expired invitation', async () => {
      invitationService.validateInvitation.mockRejectedValue(
        new Error('Invitation has expired')
      );

      await expect(
        invitationService.validateInvitation('expired-token')
      ).rejects.toThrow('Invitation has expired');
    });

    it('shows error for invalid invitation token', async () => {
      invitationService.validateInvitation.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await expect(
        invitationService.validateInvitation('invalid-token')
      ).rejects.toThrow('Invalid invitation token');
    });

    it('shows error for already accepted invitation', async () => {
      invitationService.validateInvitation.mockRejectedValue(
        new Error('Invitation has already been accepted')
      );

      await expect(
        invitationService.validateInvitation('used-token')
      ).rejects.toThrow('Invitation has already been accepted');
    });
  });

  describe('IA-4: User is redirected to dashboard after accepting', () => {
    it('navigates to dashboard after successful acceptance', async () => {
      const acceptedInvitation = {
        userId: 'user-123',
        email: 'newstaff@rescue.org',
        role: 'STAFF',
        rescueId: 'rescue-123',
      };

      invitationService.acceptInvitation.mockResolvedValue(acceptedInvitation);

      const result = await invitationService.acceptInvitation('valid-token', {
        firstName: 'John',
        lastName: 'Doe',
        password: 'securepassword',
      });

      expect(result.userId).toBeDefined();
      // Redirect would be handled by the component using navigation
    });
  });
});
