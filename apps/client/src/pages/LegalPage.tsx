import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { useLegalDocument, renderLegalMarkdown } from '@adopt-dont-shop/lib.legal';
import { SafeHtml } from '@/components/SafeHtml';
import { cmsPublicService } from '@/services/cmsService';

type LegalPageProps = {
  slug: 'terms' | 'privacy';
};

const TITLES: Record<LegalPageProps['slug'], string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
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
        <h1>{cmsOverrideQuery.data.title}</h1>
        <SafeHtml html={cmsOverrideQuery.data.content} />
      </Container>
    );
  }

  if (legalQuery.isError || !legalQuery.data) {
    return (
      <Container>
        <h1>{TITLES[slug]}</h1>
        <p>Content not found.</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1>{TITLES[slug]}</h1>
      <SafeHtml html={renderLegalMarkdown(legalQuery.data.content)} />
    </Container>
  );
};
