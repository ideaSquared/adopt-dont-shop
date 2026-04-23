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

const ArticleList = styled.div`
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ArticleCard = styled(Link)`
  display: block;
  padding: 1.5rem;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 10px;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: #2563eb;
    box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
  }
`;

const ArticleTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0 0 0.4rem 0;
`;

const ArticleExcerpt = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.text.secondary};
  margin: 0;
  line-height: 1.5;
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
    <PageContainer>
      <PageHeader>
        <h1>Help Center</h1>
        <p>Answers to common questions about adopting, rescues, and using the platform</p>
      </PageHeader>

      {loading ? (
        <SpinnerWrapper>
          <Spinner size='lg' label='Loading articles' />
        </SpinnerWrapper>
      ) : articles.length === 0 ? (
        <EmptyState>No help articles yet — check back soon!</EmptyState>
      ) : (
        <ArticleList>
          {articles.map(article => (
            <ArticleCard key={article.contentId} to={`/help/${article.slug}`}>
              <ArticleTitle>{article.title}</ArticleTitle>
              {article.excerpt && <ArticleExcerpt>{article.excerpt}</ArticleExcerpt>}
            </ArticleCard>
          ))}
        </ArticleList>
      )}
    </PageContainer>
  );
};
