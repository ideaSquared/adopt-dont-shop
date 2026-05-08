import { Link } from 'react-router-dom';
import styled from 'styled-components';

// ADS-480: catch-all 404 page rendered when no other route matches.
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
`;

const Code = styled.h1`
  font-size: 4rem;
  margin: 0;
  color: #2563eb;
`;

const Title = styled.h2`
  margin: 0.5rem 0 1rem;
  font-size: 1.5rem;
  color: #1f2937;
`;

const Body = styled.p`
  color: #4b5563;
  max-width: 32rem;
  margin: 0 0 1.5rem;
`;

const HomeLink = styled(Link)`
  color: white;
  background-color: #2563eb;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;

  &:hover {
    background-color: #1d4ed8;
  }
`;

export const NotFoundPage = () => (
  <Container>
    <Code>404</Code>
    <Title>Page not found</Title>
    <Body>
      We couldn&apos;t find the page you were looking for. It may have moved or no longer exists.
    </Body>
    <HomeLink to='/'>Go back home</HomeLink>
  </Container>
);

export default NotFoundPage;
