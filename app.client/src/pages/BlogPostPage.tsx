import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { SafeHtml } from '@/components/SafeHtml';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';
import * as styles from './BlogPostPage.css';

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      return;
    }
    cmsPublicService
      .getBlogPost(slug)
      .then(setPost)
      .catch(() => navigate('/blog', { replace: true }))
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

  if (!post) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.notFound}>Post not found.</div>
      </Container>
    );
  }

  return (
    <Container className={styles.pageContainer}>
      <Link to='/blog' className={styles.backLink}>
        ← Back to Blog
      </Link>

      {post.featuredImageUrl && (
        <img src={post.featuredImageUrl} alt={post.title} className={styles.featuredImage} />
      )}

      <h1 className={styles.postTitle}>{post.title}</h1>
      <div className={styles.postMeta}>
        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
      </div>

      <SafeHtml html={post.content} className={styles.postContent} />
    </Container>
  );
};
