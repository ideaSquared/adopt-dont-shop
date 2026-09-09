import React from 'react';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
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
        <h1>Cookie Policy</h1>
        <p>Content not found.</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1>Cookie Policy</h1>
      <SafeHtml html={renderLegalMarkdown(data.content)} />
    </Container>
  );
};
