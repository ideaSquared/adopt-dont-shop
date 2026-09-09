import { useQuery } from '@tanstack/react-query';
import { fetchLegalDocument, type LegalDocumentSlug } from '../services/legal-service';

/**
 * ADS-1326: fetches a versioned legal document (terms / privacy / cookies)
 * straight from the gateway's markdown-backed endpoint — always available,
 * unlike the CMS pages that back /terms and /privacy today.
 */
export const useLegalDocument = (slug: LegalDocumentSlug) =>
  useQuery({
    queryKey: ['legal-document', slug],
    queryFn: () => fetchLegalDocument(slug),
    staleTime: 5 * 60_000,
  });
