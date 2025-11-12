/**
 * Test Data Factory
 *
 * Utilities for creating test data with real database operations
 * Use these instead of mocking model methods
 */

import { testDb } from '../../setup-tests';

/**
 * Get all models dynamically from the test database
 */
const getModels = () => testDb.models;

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: Record<string, unknown> = {}) {
  const User = getModels().User;
  return await User.create({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: '$2a$10$hashedPasswordForTesting',
    firstName: 'Test',
    lastName: 'User',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    ...overrides,
  });
}

/**
 * Create a test rescue organization
 */
export async function createTestRescue(overrides: Record<string, unknown> = {}) {
  const Rescue = getModels().Rescue;
  return await Rescue.create({
    organizationName: `Test Rescue ${Date.now()}`,
    email: `rescue-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    phone: '555-0100',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'US',
    verificationStatus: 'verified',
    ...overrides,
  });
}

/**
 * Create a test pet
 */
export async function createTestPet(rescueId: string, overrides: Record<string, unknown> = {}) {
  const Pet = getModels().Pet;
  return await Pet.create({
    rescueId,
    name: `Test Pet ${Date.now()}`,
    type: 'dog',
    breed: 'Mixed Breed',
    ageYears: 2,
    ageMonths: 0,
    gender: 'male',
    size: 'medium',
    status: 'available',
    description: 'A friendly test pet',
    ...overrides,
  });
}

/**
 * Create a test application
 */
export async function createTestApplication(
  userId: string,
  rescueId: string,
  petId: string,
  overrides: Record<string, unknown> = {}
) {
  const Application = getModels().Application;
  return await Application.create({
    userId,
    rescueId,
    petId,
    status: 'submitted',
    responses: {},
    ...overrides,
  });
}

/**
 * Create a test chat
 */
export async function createTestChat(rescueId: string, overrides: Record<string, unknown> = {}) {
  const Chat = getModels().Chat;
  return await Chat.create({
    rescueId,
    type: 'direct',
    status: 'active',
    ...overrides,
  });
}

/**
 * Create a test message
 */
export async function createTestMessage(
  chatId: string,
  senderId: string,
  overrides: Record<string, unknown> = {}
) {
  const Message = getModels().Message;
  return await Message.create({
    chatId,
    senderId,
    content: 'Test message',
    type: 'text',
    format: 'plain',
    ...overrides,
  });
}

/**
 * Create a test email template
 */
export async function createTestEmailTemplate(overrides: Record<string, unknown> = {}) {
  const EmailTemplate = getModels().EmailTemplate;
  return await EmailTemplate.create({
    name: `Test Template ${Date.now()}`,
    subject: 'Test Subject',
    htmlBody: '<p>Test HTML Body</p>',
    textBody: 'Test Text Body',
    category: 'transactional',
    status: 'active',
    ...overrides,
  });
}

/**
 * Create a test email queue entry
 */
export async function createTestEmailQueue(overrides: Record<string, unknown> = {}) {
  const EmailQueue = getModels().EmailQueue;
  return await EmailQueue.create({
    recipientEmail: `test-${Date.now()}@example.com`,
    subject: 'Test Email',
    htmlBody: '<p>Test</p>',
    textBody: 'Test',
    status: 'pending',
    priority: 'normal',
    ...overrides,
  });
}

/**
 * Create a test notification
 */
export async function createTestNotification(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const Notification = getModels().Notification;
  return await Notification.create({
    userId,
    type: 'info',
    title: 'Test Notification',
    message: 'Test notification message',
    isRead: false,
    ...overrides,
  });
}

/**
 * Create a test audit log entry
 */
export async function createTestAuditLog(overrides: Record<string, unknown> = {}) {
  const AuditLog = getModels().AuditLog;
  return await AuditLog.create({
    action: 'test_action',
    entityType: 'user',
    entityId: 'test-entity-id',
    changes: {},
    ipAddress: '127.0.0.1',
    ...overrides,
  });
}

/**
 * Create a test report
 */
export async function createTestReport(
  reporterId: string,
  overrides: Record<string, unknown> = {}
) {
  const Report = getModels().Report;
  return await Report.create({
    reporterId,
    reportedEntityType: 'user',
    reportedEntityId: 'test-entity-id',
    category: 'spam',
    description: 'Test report description',
    status: 'pending',
    severity: 'medium',
    ...overrides,
  });
}

/**
 * Create test staff member
 */
export async function createTestStaffMember(
  userId: string,
  rescueId: string,
  overrides: Record<string, unknown> = {}
) {
  const StaffMember = getModels().StaffMember;
  return await StaffMember.create({
    userId,
    rescueId,
    role: 'staff',
    permissions: {},
    ...overrides,
  });
}

/**
 * Create test email preference
 */
export async function createTestEmailPreference(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const EmailPreference = getModels().EmailPreference;
  return await EmailPreference.create({
    userId,
    emailType: 'marketing',
    enabled: true,
    ...overrides,
  });
}

/**
 * Clean all data from a specific model
 */
export async function cleanModel(modelName: string) {
  const model = getModels()[modelName];
  if (model) {
    await model.destroy({ where: {}, truncate: true, cascade: true });
  }
}

/**
 * Count records in a model
 */
export async function countRecords(modelName: string): Promise<number> {
  const model = getModels()[modelName];
  if (model) {
    return await model.count();
  }
  return 0;
}
