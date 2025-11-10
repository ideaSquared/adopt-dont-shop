/**
 * Manual mock for ApplicationTimeline model
 * Prevents model initialization during tests
 */

export enum TimelineEventType {
  STAGE_CHANGE = 'stage_change',
  STATUS_UPDATE = 'status_update',
  NOTE_ADDED = 'note_added',
  REFERENCE_CONTACTED = 'reference_contacted',
  REFERENCE_VERIFIED = 'reference_verified',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  HOME_VISIT_COMPLETED = 'home_visit_completed',
  HOME_VISIT_RESCHEDULED = 'home_visit_rescheduled',
  HOME_VISIT_CANCELLED = 'home_visit_cancelled',
  SCORE_UPDATED = 'score_updated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DECISION_MADE = 'decision_made',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  APPLICATION_REOPENED = 'application_reopened',
  COMMUNICATION_SENT = 'communication_sent',
  COMMUNICATION_RECEIVED = 'communication_received',
  SYSTEM_AUTO_PROGRESSION = 'system_auto_progression',
  MANUAL_OVERRIDE = 'manual_override',
}

const ApplicationTimeline = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn(),
  associate: jest.fn(),
};

export default ApplicationTimeline;
export { ApplicationTimeline };
