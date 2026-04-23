import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Row = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const GhostLink = styled(Link)`
  color: #fff;
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-weight: 500;
  font-size: ${({ theme }) => theme.typography.size.sm};
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

const SolidLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary[700]};
  background: #fff;
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-weight: 600;
  font-size: ${({ theme }) => theme.typography.size.sm};
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

export const AuthCtas: React.FC = () => (
  <Row>
    <GhostLink to='/login'>Log in</GhostLink>
    <SolidLink to='/register'>Sign up</SolidLink>
  </Row>
);
