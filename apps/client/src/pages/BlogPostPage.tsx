import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { formatCustomDate } from '@adopt-dont-shop/lib.utils';
import { SafeHtml } from '@/components/SafeHtml';
import { useBlogPost } from '@/hooks/useCmsContent';
import * as styles from './BlogPostPage.css';

const formatDate = (dateString: string): string => formatCustomDate(dateString, 'd MMMM yyyy');

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError } = useBlogPost(slug);

  useEffect(() => {
    if (isError) {
      navigate('/blog', { replace: true });
    }
  }, [isError, navigate]);

  if (isLoading) {
    return (
      <Container size='md' className={styles.pageContainer}>
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading' />
        </div>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container size='md' className={styles.pageContainer}>
        <EmptyState title='Post not found.' />
      </Container>
    );
  }

  return (
    <Container size='md' className={styles.pageContainer}>
      <Link to='/blog' className={styles.backLink}>
        <ArrowLeft size='1em' aria-hidden='true' /> Back to Blog
      </Link>

      {post.featuredImageUrl && (
        <img src={post.featuredImageUrl} alt={post.title} className={styles.featuredImage} />
      )}

      <PageHeader
        className={styles.header}
        title={post.title}
        description={formatDate(post.publishedAt ?? post.createdAt)}
      />

      <SafeHtml html={post.content} className={styles.postContent} />
    </Container>
  );
};
