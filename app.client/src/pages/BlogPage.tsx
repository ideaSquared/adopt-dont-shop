import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';

const PageContainer = styled(Container)`
  padding: 3rem 0;
  min-height: calc(100vh - 200px);
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    margin: 0 0 1rem 0;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
    max-width: 600px;
    margin: 0 auto;
  }
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
`;

const PostCard = styled(Link)`
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`;

const PostImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const PostImagePlaceholder = styled.div`
  width: 100%;
  height: 200px;
  background: ${props => props.theme.background.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
`;

const PostBody = styled.div`
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PostTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0;
  line-height: 1.4;
`;

const PostExcerpt = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.text.secondary};
  margin: 0;
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PostDate = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.text.secondary};
  margin-top: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme.text.secondary};
  font-size: 1.1rem;
`;

const SpinnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 4rem;
`;

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
    <PageContainer>
      <PageHeader>
        <h1>Blog</h1>
        <p>News, stories, and updates from the world of pet adoption</p>
      </PageHeader>

      {loading ? (
        <SpinnerWrapper>
          <Spinner size='lg' label='Loading posts' />
        </SpinnerWrapper>
      ) : posts.length === 0 ? (
        <EmptyState>No posts yet — check back soon!</EmptyState>
      ) : (
        <PostGrid>
          {posts.map(post => (
            <PostCard key={post.contentId} to={`/blog/${post.slug}`}>
              {post.featuredImageUrl ? (
                <PostImage src={post.featuredImageUrl} alt={post.title} />
              ) : (
                <PostImagePlaceholder>🐾</PostImagePlaceholder>
              )}
              <PostBody>
                <PostTitle>{post.title}</PostTitle>
                {post.excerpt && <PostExcerpt>{post.excerpt}</PostExcerpt>}
                <PostDate>{formatDate(post.publishedAt ?? post.createdAt)}</PostDate>
              </PostBody>
            </PostCard>
          ))}
        </PostGrid>
      )}
    </PageContainer>
  );
};
