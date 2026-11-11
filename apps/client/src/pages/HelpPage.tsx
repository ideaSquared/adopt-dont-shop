import React from 'react';
import { ChevronRight, FileText } from 'lucide-react';
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
    <Container size='md' className={styles.pageContainer}>
      <PageHeader
        className={styles.header}
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
        <ul className={styles.articleList}>
          {articles.map(article => (
            <li key={article.contentId}>
              <Link to={`/help/${article.slug}`} className={styles.articleCard}>
                <span className={styles.articleIcon} aria-hidden='true'>
                  <FileText size='1em' />
                </span>
                <div className={styles.articleText}>
                  <h2 className={styles.articleTitle}>{article.title}</h2>
                  {article.excerpt && <p className={styles.articleExcerpt}>{article.excerpt}</p>}
                </div>
                <ChevronRight size='1.25em' aria-hidden='true' className={styles.articleChevron} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className={styles.contactPrompt} aria-labelledby='help-contact'>
        <h2 id='help-contact' className={styles.contactTitle}>
          Can&apos;t find what you need?
        </h2>
        <p className={styles.contactText}>
          Our team is happy to help with anything not covered here.{' '}
          <Link to='/contact' className={styles.contactLink}>
            Contact us
          </Link>
        </p>
      </section>
    </Container>
  );
};
