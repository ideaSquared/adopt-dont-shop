// Main exports for @adopt-dont-shop/lib.legal

// Components
export { LegalReacceptanceModal } from './components/LegalReacceptanceModal';
export { CookieBanner, useCookieConsent } from './components/CookieBanner';

// Service / schemas
export {
  fetchPendingReacceptance,
  fetchCookiesVersion,
  recordReacceptance,
  PendingReacceptanceItemSchema,
  PendingReacceptanceResponseSchema,
} from './services/legal-service';
export type {
  PendingReacceptanceItem,
  PendingReacceptanceResponse,
  RecordReacceptanceInput,
} from './services/legal-service';

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
