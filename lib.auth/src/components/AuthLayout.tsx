import React, { ReactNode } from 'react';
import { Card } from '@adopt-dont-shop/lib.components';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    ${(props) => props.theme?.background?.primary || '#f7fafc'} 0%,
    ${(props) => props.theme?.background?.secondary || '#edf2f7'} 100%
  );
`;

const AuthCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: ${(props) => props.theme?.text?.primary || '#1a202c'};
    font-weight: 600;
  }

  p {
    color: ${(props) => props.theme?.text?.secondary || '#718096'};
    margin: 0;
    font-size: 0.95rem;
  }
`;

export interface AuthLayoutProps {
  /**
   * Title displayed at the top of the auth form
   */
  title: string;
  /**
   * Subtitle/description text
   */
  subtitle?: string;
  /**
   * Auth form content (LoginForm or RegisterForm)
   */
  children: ReactNode;
  /**
   * Optional footer content (e.g., links to other pages)
   */
  footer?: ReactNode;
}

/**
 * Shared layout wrapper for all authentication pages
 * Provides consistent styling and branding across all apps
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  return (
    <Container>
      <AuthCard>
        <Header>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </Header>
        {children}
        {footer && footer}
      </AuthCard>
    </Container>
  );
};
