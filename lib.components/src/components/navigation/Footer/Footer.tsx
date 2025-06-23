import React from 'react';
import styled from 'styled-components';

const StyledFooter = styled.footer`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
  padding: ${({ theme }) => theme.spacing.xl} 0;
  margin-top: auto;
`;

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const FooterText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const FooterLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FooterLink = styled.a`
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <StyledFooter className={className}>
      <FooterContainer>
        <FooterLinks>
          <FooterLink href='/about'>About</FooterLink>
          <FooterLink href='/privacy'>Privacy</FooterLink>
          <FooterLink href='/terms'>Terms</FooterLink>
          <FooterLink href='/contact'>Contact</FooterLink>
        </FooterLinks>
        <FooterText>
          © {new Date().getFullYear()} Adopt Don't Shop. All rights reserved.
        </FooterText>
      </FooterContainer>
    </StyledFooter>
  );
};

Footer.displayName = 'Footer';
