import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { FiSearch, FiBell, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi';

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
}

const HeaderContainer = styled.header<{ $sidebarCollapsed: boolean }>`
  height: 80px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: fixed;
  top: 0;
  left: ${props => (props.$sidebarCollapsed ? '80px' : '280px')};
  right: 0;
  z-index: 90;
  transition: left 0.3s ease;
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 500px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #f9fafb;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    background: #ffffff;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 1rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconButton = styled.button<{ $hasNotification?: boolean }>`
  position: relative;
  background: transparent;
  border: 1px solid #d1d5db;
  padding: 0.625rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: ${props => props.theme.colors.primary[500]};
    color: ${props => props.theme.colors.primary[600]};
  }

  svg {
    font-size: 1.25rem;
  }

  ${props =>
    props.$hasNotification &&
    `
    &::after {
      content: '';
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }
  `}
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: ${props => props.theme.colors.primary[500]};
  }
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
`;

const UserName = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: capitalize;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 220px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: ${props => (props.$isOpen ? 'block' : 'none')};
  z-index: 1000;
  overflow: hidden;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${props => (props.$danger ? '#ef4444' : '#111827')};
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.$danger ? '#fef2f2' : '#f9fafb')};
  }

  svg {
    font-size: 1rem;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
`;

export const AdminHeader: React.FC<AdminHeaderProps> = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'A';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getUserRole = () => {
    if (!user?.userType) return 'Admin';
    return user.userType.replace('_', ' ');
  };

  return (
    <HeaderContainer $sidebarCollapsed={sidebarCollapsed}>
      <SearchContainer>
        <SearchIcon />
        <SearchInput
          type='text'
          placeholder='Search users, rescues, or content...'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      <HeaderActions>
        <IconButton $hasNotification={true} aria-label='Notifications'>
          <FiBell />
        </IconButton>

        <UserMenu>
          <UserButton onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <UserAvatar>{getInitials(user?.firstName, user?.lastName)}</UserAvatar>
            <UserInfo>
              <UserName>
                {user?.firstName} {user?.lastName}
              </UserName>
              <UserRole>{getUserRole()}</UserRole>
            </UserInfo>
            <FiChevronDown />
          </UserButton>

          <DropdownMenu $isOpen={userMenuOpen}>
            <DropdownItem onClick={() => setUserMenuOpen(false)}>
              <FiUser />
              Profile
            </DropdownItem>
            <DropdownItem onClick={() => setUserMenuOpen(false)}>
              <FiSettings />
              Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem $danger onClick={handleLogout}>
              <FiLogOut />
              Sign Out
            </DropdownItem>
          </DropdownMenu>
        </UserMenu>
      </HeaderActions>
    </HeaderContainer>
  );
};
