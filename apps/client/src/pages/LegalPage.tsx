import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { useLegalDocument, parseLegalDocument } from '@adopt-dont-shop/lib.legal';
import { SafeHtml } from '@/components/SafeHtml';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { LEGAL_DOCUMENT_TITLES } from '@/components/legal/legal-documents';
import { cmsPublicService } from '@/services/cmsService';

type LegalPageProps = {
  slug: 'terms' | 'privacy';
};

/**
 * ADS-1326: /terms and /privacy used to render a CMS page exclusively, but
 * no migration seeds one — a fresh database showed "Content not found."
 * The versioned markdown document (services/gateway's /api/v1/legal/*,
 * backed by docs/legal/*.md) is always available and is now the primary
 * source; a CMS page for the slug, if one exists, is an optional override
 * (e.g. a rescue-specific legal notice a content editor has published).
 */
export const LegalPage: React.FC<LegalPageProps> = ({ slug }) => {
  const legalQuery = useLegalDocument(slug);
  const cmsOverrideQuery = useQuery({
    queryKey: ['legal-cms-override', slug],
    queryFn: () => cmsPublicService.getStaticPage(slug),
    retry: false,
  });
  const content = legalQuery.data?.content;
  const document = React.useMemo(() => (content ? parseLegalDocument(content) : null), [content]);

  if (legalQuery.isLoading || cmsOverrideQuery.isLoading) {
    return (
      <Container>
        <Spinner size='lg' label='Loading' />
      </Container>
    );
  }

  if (cmsOverrideQuery.isSuccess && cmsOverrideQuery.data) {
    return (
      <Container>
        <PageHeader title={cmsOverrideQuery.data.title} />
        <SafeHtml html={cmsOverrideQuery.data.content} />
      </Container>
    );
  }

  if (legalQuery.isError || !document) {
    return (
      <Container>
        <PageHeader title={LEGAL_DOCUMENT_TITLES[slug]} />
        <EmptyState title='Content not found.' />
      </Container>
    );
  }

  return <LegalDocumentView slug={slug} document={document} />;
};
