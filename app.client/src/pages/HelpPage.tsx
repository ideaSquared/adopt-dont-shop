import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Spinner } from '@adopt-dont-shop/lib.components';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';
import * as styles from './HelpPage.css';

export const HelpPage: React.FC = () => {
  const [articles, setArticles] = useState<PublicContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(() => {
    setLoading(true);
    setError(null);
    cmsPublicService
      .listHelpArticles()
      .then(result => {
        setArticles(result.content);
        setLoading(false);
      })
      .catch(() => {
        setError('We couldn’t load help articles. Please try again.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  return (
    <Container className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Help Center</h1>
        <p>Answers to common questions about adopting, rescues, and using the platform</p>
      </div>

      {loading ? (
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading articles' />
        </div>
      ) : error ? (
        <div className={styles.emptyState} role='alert'>
          <p>{error}</p>
          <Button onClick={loadArticles}>Try Again</Button>
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.emptyState}>No help articles yet — check back soon!</div>
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
