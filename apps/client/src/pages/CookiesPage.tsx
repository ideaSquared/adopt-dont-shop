import React from 'react';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { useLegalDocument, parseLegalDocument } from '@adopt-dont-shop/lib.legal';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { LEGAL_DOCUMENT_TITLES } from '@/components/legal/legal-documents';

/**
 * ADS-1326: /cookies is linked from CookieBanner / ManageCookiesLink
 * (packages/lib.legal) but had no route — renders the versioned cookies
 * policy markdown served by the gateway at /api/v1/legal/cookies.
 */
export const CookiesPage: React.FC = () => {
  const { data, isLoading, isError } = useLegalDocument('cookies');
  const content = data?.content;
  const document = React.useMemo(() => (content ? parseLegalDocument(content) : null), [content]);

  if (isLoading) {
    return (
      <Container>
        <Spinner size='lg' label='Loading' />
      </Container>
    );
  }

  if (isError || !document) {
    return (
      <Container>
        <PageHeader title={LEGAL_DOCUMENT_TITLES.cookies} />
        <EmptyState title='Content not found.' />
      </Container>
    );
  }

  return <LegalDocumentView slug='cookies' document={document} />;
};
