import React, { useEffect, useState } from 'react';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { SafeHtml } from '@/components/SafeHtml';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';

type LegalPageProps = {
  slug: 'terms' | 'privacy';
};

export const LegalPage: React.FC<LegalPageProps> = ({ slug }) => {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cmsPublicService
      .getStaticPage(slug)
      .then(result => {
        if (!cancelled) {
          setContent(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Content not found.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <Container>
        <Spinner size='lg' label='Loading' />
      </Container>
    );
  }

  if (error || !content) {
    return (
      <Container>
        <h1>{slug === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h1>
        <p>{error ?? 'Content not found.'}</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1>{content.title}</h1>
      <SafeHtml html={content.content} />
    </Container>
  );
};

export default LegalPage;
