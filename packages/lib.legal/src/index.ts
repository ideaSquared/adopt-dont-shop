// Main exports for @adopt-dont-shop/lib.legal

// Components
export { LegalReacceptanceModal } from './components/LegalReacceptanceModal';
export { CookieBanner, useCookieConsent } from './components/CookieBanner';
export { ManageCookiesLink } from './components/ManageCookiesLink';

// Service / schemas
export {
  fetchPendingReacceptance,
  fetchCookiesVersion,
  fetchLegalDocument,
  recordReacceptance,
  PendingReacceptanceItemSchema,
  PendingReacceptanceResponseSchema,
  LegalDocumentSlugSchema,
} from './services/legal-service';
export type {
  PendingReacceptanceItem,
  PendingReacceptanceResponse,
  RecordReacceptanceInput,
  LegalDocument,
  LegalDocumentSlug,
} from './services/legal-service';

// Versioned legal document rendering (ADS-1326)
export { useLegalDocument } from './hooks/useLegalDocument';
export { renderLegalMarkdown } from './utils/render-legal-markdown';

// Cookie banner storage + sign-in attach
export {
  COOKIE_CONSENT_STORAGE_KEY,
  StoredCookieConsentSchema,
  readStoredConsent,
  writeStoredConsent,
  clearStoredConsent,
} from './services/cookie-consent-storage';
export type { StoredCookieConsent } from './services/cookie-consent-storage';
export { attachStoredCookieConsent } from './services/attach-stored-consent';
