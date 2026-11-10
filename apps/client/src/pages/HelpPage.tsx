import React from 'react';
import { Link } from 'react-router';
import {
  Container,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@adopt-dont-shop/lib.components';
import { useHelpArticles } from '@/hooks/useCmsContent';
import * as styles from './HelpPage.css';

export const HelpPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useHelpArticles();
  const articles = data?.content ?? [];

  return (
    <Container className={styles.pageContainer}>
      <PageHeader
        title='Help Center'
        description='Answers to common questions about adopting, rescues, and using the platform'
      />

      {isLoading ? (
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading articles' />
        </div>
      ) : isError ? (
        <ErrorState
          message='We couldn’t load help articles. Please try again.'
          onRetry={() => void refetch()}
        />
      ) : articles.length === 0 ? (
        <EmptyState title='No help articles yet — check back soon!' />
      ) : (
        <div className={styles.articleList}>
          {articles.map(article => (
            <Link
              key={article.contentId}
              to={`/help/${article.slug}`}
              className={styles.articleCard}
            >
              <h2 className={styles.articleTitle}>{article.title}</h2>
              {article.excerpt && <p className={styles.articleExcerpt}>{article.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
};
