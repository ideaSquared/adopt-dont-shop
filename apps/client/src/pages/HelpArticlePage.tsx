import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { SafeHtml } from '@/components/SafeHtml';
import { useHelpArticle } from '@/hooks/useCmsContent';
import * as styles from './HelpArticlePage.css';

export const HelpArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading, isError } = useHelpArticle(slug);

  useEffect(() => {
    if (isError) {
      navigate('/help', { replace: true });
    }
  }, [isError, navigate]);

  if (isLoading) {
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
        <EmptyState title='Article not found.' />
      </Container>
    );
  }

  return (
    <Container className={styles.pageContainer}>
      <Link to='/help' className={styles.backLink}>
        <ArrowLeft size='1em' aria-hidden='true' /> Back to Help Center
      </Link>
      <PageHeader title={article.title} />
      <SafeHtml html={article.content} className={styles.articleContent} />
    </Container>
  );
};
