import React from 'react';
import styled from 'styled-components';

const StyledHeader = styled.header`
  background: ${({ theme }) => theme.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.primary};
  padding: ${({ theme }) => theme.spacing.md} 0;
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
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
  color: ${({ theme }) => theme.text.primary};
`;

const Navigation = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const NavLink = styled.a`
  color: ${({ theme }) => theme.text.secondary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:hover {
    color: ${({ theme }) => theme.text.primary};
  }
`;

export interface HeaderProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Adopt Don't Shop",
  className,
  children,
}) => {
  return (
    <StyledHeader className={className}>
      <HeaderContainer>
        <Logo>{title}</Logo>
        <Navigation>
          {children || (
            <>
              <NavLink href='/'>Home</NavLink>
              <NavLink href='/pets'>Find Pets</NavLink>
              <NavLink href='/about'>About</NavLink>
            </>
          )}
        </Navigation>
      </HeaderContainer>
    </StyledHeader>
  );
};

Header.displayName = 'Header';

