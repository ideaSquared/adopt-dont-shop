import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Heading, Text, Button } from '@adopt-dont-shop/components';
import { useAuth } from '@/contexts/AuthContext';

const LayoutContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.background?.primary || '#FFFFFF'};
`;

const Header = styled.header`
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled(Heading)`
  color: #3b82f6;
  margin: 0;
`;

const Navigation = styled.nav`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavButton = styled(Button)<{ $isActive?: boolean }>`
  ${props =>
    props.$isActive &&
    `
    background-color: #3B82F6;
    color: white;
  `}
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MainContent = styled.main`
  flex: 1;
`;

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout with navigation
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <LayoutContainer>
      <Header>
        <HeaderContent>
          <Logo level='h2'>Rescue Portal</Logo>

          <Navigation>
            <NavButton
              variant={isActive('/dashboard') ? 'primary' : 'secondary'}
              size='sm'
              onClick={() => navigate('/dashboard')}
              $isActive={isActive('/dashboard')}
            >
              Dashboard
            </NavButton>
            <NavButton
              variant={isActive('/pets') ? 'primary' : 'secondary'}
              size='sm'
              onClick={() => navigate('/pets')}
              $isActive={isActive('/pets')}
            >
              Pets
            </NavButton>
          </Navigation>

          <UserSection>
            {user && (
              <>
                <Text style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  {user.first_name} {user.last_name}
                </Text>
                <Button variant='secondary' size='sm' onClick={handleLogout}>
                  Logout
                </Button>
              </>
            )}
          </UserSection>
        </HeaderContent>
      </Header>

      <MainContent>{children}</MainContent>
    </LayoutContainer>
  );
};
