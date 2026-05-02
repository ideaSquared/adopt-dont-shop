import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';
import * as styles from './BlogPage.css';

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<PublicContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cmsPublicService
      .listBlogPosts()
      .then(result => {
        setPosts(result.content);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Container className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Blog</h1>
        <p>News, stories, and updates from the world of pet adoption</p>
      </div>

      {loading ? (
        <div className={styles.spinnerWrapper}>
          <Spinner size='lg' label='Loading posts' />
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>No posts yet — check back soon!</div>
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
