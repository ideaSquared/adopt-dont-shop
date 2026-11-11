export type LegalDocumentSlug = 'terms' | 'privacy' | 'cookies';

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentSlug, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
};
