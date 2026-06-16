import { describe, expect, it } from 'vitest';
import {
  APPLICATIONS_ENDPOINTS,
  APPLICATION_BY_ID,
  UPDATE_APPLICATION,
  WITHDRAW_APPLICATION,
  UPDATE_STATUS,
  APPLICATION_HISTORY,
  PET_APPLICATIONS,
  RESCUE_APPLICATIONS,
  UPLOAD_DOCUMENTS,
  DOWNLOAD_DOCUMENT,
  ADD_REVIEW_NOTE,
  GET_REVIEW_NOTES,
  APPLICATIONS,
  APPLICATION_STATS,
} from './endpoints';

describe('applications endpoint builders', () => {
  it('exposes the collection and stats paths as static strings', () => {
    expect(APPLICATIONS).toBe('/api/v1/applications');
    expect(APPLICATION_STATS).toBe('/api/v1/applications/stats');
  });

  it('builds id-scoped resource paths', () => {
    expect(APPLICATION_BY_ID('app-1')).toBe('/api/v1/applications/app-1');
    expect(UPDATE_APPLICATION('app-1')).toBe('/api/v1/applications/app-1');
    expect(WITHDRAW_APPLICATION('app-1')).toBe('/api/v1/applications/app-1/withdraw');
    expect(UPDATE_STATUS('app-1')).toBe('/api/v1/applications/app-1/status');
    expect(APPLICATION_HISTORY('app-1')).toBe('/api/v1/applications/app-1/history');
  });

  it('builds nested actor- and document-scoped paths', () => {
    expect(PET_APPLICATIONS('pet-1')).toBe('/api/v1/applications/pet/pet-1');
    expect(RESCUE_APPLICATIONS('rescue-1')).toBe('/api/v1/applications/rescue/rescue-1');
    expect(UPLOAD_DOCUMENTS('app-1')).toBe('/api/v1/applications/app-1/documents');
    expect(DOWNLOAD_DOCUMENT('app-1', 'doc-1')).toBe('/api/v1/applications/app-1/documents/doc-1');
  });

  it('builds review-note paths', () => {
    expect(ADD_REVIEW_NOTE('app-1')).toBe('/api/v1/applications/app-1/notes');
    expect(GET_REVIEW_NOTES('app-1')).toBe('/api/v1/applications/app-1/notes');
  });

  it('keeps the grouped builder map in sync with the named exports', () => {
    expect(APPLICATIONS_ENDPOINTS.SUBMIT_APPLICATION).toBe('/api/v1/applications/submit');
    expect(APPLICATIONS_ENDPOINTS.ADOPTION_SUCCESS_METRICS).toBe(
      '/api/v1/applications/metrics/success'
    );
    expect(APPLICATIONS_ENDPOINTS.USER_APPLICATIONS).toBe('/api/v1/applications/user');
  });
});
