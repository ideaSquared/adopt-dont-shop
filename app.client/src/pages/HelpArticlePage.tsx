import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import DOMPurify from 'dompurify';
import { Container, Spinner } from '@adopt-dont-shop/lib.components';
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

const ArticleTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text.primary};
  margin: 0 0 2rem 0;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const ArticleContent = styled.div`
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

export const HelpArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    cmsPublicService
      .getHelpArticle(slug)
      .then(setArticle)
      .catch(() => navigate('/help', { replace: true }))
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

  if (!article) {
    return (
      <PageContainer>
        <div>Article not found.</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to='/help'>← Back to Help Center</BackLink>
      <ArticleTitle>{article.title}</ArticleTitle>
      {/* eslint-disable-next-line react/no-danger -- Content is sanitized with DOMPurify */}
      <ArticleContent dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
    </PageContainer>
  );
};
