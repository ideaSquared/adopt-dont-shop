import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
import { SafeHtml } from '@/components/SafeHtml';
import { cmsPublicService, type PublicContent } from '@/services/cmsService';

const PageContainer = styled(Container)`
  padding: 3rem 0;
  max-width: 800px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.text.secondary};
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 2rem;

  &:hover {
    color: ${props => props.theme.text.primary};
  }
`;

const FeaturedImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 2rem;
`;

const PostTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.text.primary};
  margin: 0 0 1rem 0;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const PostMeta = styled.div`
  display: flex;
  gap: 1rem;
  color: ${props => props.theme.text.secondary};
  font-size: 0.9rem;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
`;

const PostContent = styled(SafeHtml)`
  color: ${props => props.theme.text.primary};
  line-height: 1.8;
  font-size: 1.05rem;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${props => props.theme.text.primary};
    margin: 2rem 0 1rem;
  }

  p {
    margin: 0 0 1.2rem;
  }

  a {
    color: #2563eb;
    &:hover {
      text-decoration: underline;
    }
  }

  img {
    max-width: 100%;
    border-radius: 8px;
    margin: 1rem 0;
  }

  ul,
  ol {
    padding-left: 1.5rem;
    margin-bottom: 1.2rem;
  }

  blockquote {
    border-left: 4px solid #2563eb;
    margin: 1.5rem 0;
    padding: 0.5rem 1.5rem;
    color: ${props => props.theme.text.secondary};
    font-style: italic;
  }
`;

const SpinnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 4rem;
`;

const NotFound = styled.div`
  text-align: center;
  padding: 4rem;
  color: ${props => props.theme.text.secondary};
`;

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
      <PageContainer>
        <SpinnerWrapper>
          <Spinner size='lg' label='Loading' />
        </SpinnerWrapper>
      </PageContainer>
    );
  }

  if (!post) {
    return (
      <PageContainer>
        <NotFound>Post not found.</NotFound>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to='/blog'>← Back to Blog</BackLink>

      {post.featuredImageUrl && <FeaturedImage src={post.featuredImageUrl} alt={post.title} />}

      <PostTitle>{post.title}</PostTitle>
      <PostMeta>
        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
      </PostMeta>

      <PostContent html={post.content} />
    </PageContainer>
  );
};
