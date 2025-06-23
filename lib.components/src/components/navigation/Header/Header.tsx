import React from 'react';
import styled from 'styled-components';

const StyledHeader = styled.header`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  padding: ${({ theme }) => theme.spacing.md} 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const NavLink = styled.a`
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <StyledHeader className={className}>
      <HeaderContainer>
        <Logo>Adopt Don't Shop</Logo>
        <Nav>
          <NavLink href='/'>Home</NavLink>
          <NavLink href='/search'>Search Pets</NavLink>
          <NavLink href='/profile'>Profile</NavLink>
        </Nav>
      </HeaderContainer>
    </StyledHeader>
  );
};

Header.displayName = 'Header';
