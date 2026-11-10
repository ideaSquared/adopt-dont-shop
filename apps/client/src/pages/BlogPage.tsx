import React from 'react';
import { Link } from 'react-router';
import { Container, EmptyState, PageHeader, Spinner } from '@adopt-dont-shop/lib.components';
import { formatCustomDate } from '@adopt-dont-shop/lib.utils';
import { useBlogPosts } from '@/hooks/useCmsContent';
import * as styles from './BlogPage.css';

const formatDate = (dateString: string): string => formatCustomDate(dateString, 'd MMMM yyyy');

export const BlogPage: React.FC = () => {
  // A failed fetch degrades to the empty state, as before.
  const { data, isLoading } = useBlogPosts();
  const posts = data?.content ?? [];

  return (
    <Container className={styles.pageContainer}>
      <PageHeader
        title='Blog'
        description='News, stories, and updates from the world of pet adoption'
      />

      {isLoading ? (
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading posts' />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState title='No posts yet — check back soon!' />
      ) : (
        <div className={styles.postGrid}>
          {posts.map(post => (
            <Link key={post.contentId} to={`/blog/${post.slug}`} className={styles.postCard}>
              {post.featuredImageUrl ? (
                <img src={post.featuredImageUrl} alt={post.title} className={styles.postImage} />
              ) : (
                <div className={styles.postImagePlaceholder}>🐾</div>
              )}
              <div className={styles.postBody}>
                <h2 className={styles.postTitle}>{post.title}</h2>
                {post.excerpt && <p className={styles.postExcerpt}>{post.excerpt}</p>}
                <span className={styles.postDate}>
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
};
