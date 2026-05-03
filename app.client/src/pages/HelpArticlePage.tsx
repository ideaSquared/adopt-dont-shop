import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { SafeHtml } from '@/components/SafeHtml';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';
import * as styles from './HelpArticlePage.css';

export const HelpArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      return;
    }
    cmsPublicService
      .getHelpArticle(slug)
      .then(setArticle)
      .catch(() => navigate('/help', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading' />
        </div>
      </Container>
    );
  }

  if (!article) {
    return (
      <Container className={styles.pageContainer}>
        <div>Article not found.</div>
      </Container>
    );
  }

  return (
    <Container className={styles.pageContainer}>
      <Link to='/help' className={styles.backLink}>
        ← Back to Help Center
      </Link>
      <h1 className={styles.articleTitle}>{article.title}</h1>
      <SafeHtml html={article.content} className={styles.articleContent} />
    </Container>
  );
};
