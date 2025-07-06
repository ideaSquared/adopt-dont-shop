import { Container } from '@adopt-dont-shop/components';
import React from 'react';
import styled from 'styled-components';

const PageContainer = styled(Container)`
  min-height: 100vh;
  padding: 2rem 0;
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 4rem 2rem;

  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.2rem;
    color: #666;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

export const FavoritesPage: React.FC = () => {
  return (
    <PageContainer>
      <ComingSoon>
        <h1>Favorites Page</h1>
        <p>
          Your favorite pets will appear here. Start swiping to discover amazing pets and build your
          favorites list!
        </p>
      </ComingSoon>
    </PageContainer>
  );
};
