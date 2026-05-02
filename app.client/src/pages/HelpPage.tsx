import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';
import * as styles from './HelpPage.css';

export const HelpPage: React.FC = () => {
  const [articles, setArticles] = useState<PublicContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cmsPublicService
      .listHelpArticles()
      .then(result => {
        setArticles(result.content);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
