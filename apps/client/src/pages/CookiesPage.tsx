import React from 'react';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { useLegalDocument, renderLegalMarkdown } from '@adopt-dont-shop/lib.legal';
import { SafeHtml } from '@/components/SafeHtml';

/**
 * ADS-1326: /cookies is linked from CookieBanner / ManageCookiesLink
 * (packages/lib.legal) but had no route — renders the versioned cookies
 * policy markdown served by the gateway at /api/v1/legal/cookies.
 */
export const CookiesPage: React.FC = () => {
  const { data, isLoading, isError } = useLegalDocument('cookies');

  if (isLoading) {
    return (
      <Container>
        <Spinner size='lg' label='Loading' />
      </Container>
    );
  }

  if (isError || !data) {
    return (
      <Container>
        <PageHeader title='Cookie Policy' />
        <EmptyState title='Content not found.' />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader title='Cookie Policy' />
      <SafeHtml html={renderLegalMarkdown(data.content)} />
    </Container>
  );
};
