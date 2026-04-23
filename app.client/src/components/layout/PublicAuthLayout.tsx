import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.background.primary};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.primary};
`;

const Logo = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: 700;
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.text.primary};
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.border.radius.sm};
  }
`;

const LogoIcon = styled.span`
  font-size: 1.5rem;
  line-height: 1;
`;

const SwitchLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary[600]};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.border.radius.sm};
  }
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[4]};
`;

export const PublicAuthLayout: React.FC = () => {
  const location = useLocation();
  const onLogin = location.pathname.startsWith('/login');
  const switchTo = onLogin ? '/register' : '/login';
  const switchLabel = onLogin ? 'Sign up' : 'Log in';

  return (
    <Shell>
      <Header>
        <Logo to='/'>
          <LogoIcon aria-hidden='true'>🐾</LogoIcon>
          Adopt Don&apos;t Shop
        </Logo>
        <SwitchLink to={switchTo}>{switchLabel}</SwitchLink>
      </Header>
      <Main>
        <Outlet />
      </Main>
    </Shell>
  );
};
