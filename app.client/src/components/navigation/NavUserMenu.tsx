import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import {
  MdHelpOutline,
  MdLogout,
  MdOutlineDescription,
  MdOutlineSettings,
  MdPersonOutline,
} from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Avatar } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';

const TriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  background: transparent;
  border: none;
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.border.radius.full};
  cursor: pointer;
  color: inherit;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

const Content = styled(DropdownMenu.Content)`
  min-width: 240px;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  border: 1px solid ${({ theme }) => theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: ${({ theme }) => theme.spacing[1]} 0;
  z-index: 1100;
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]} ${theme.spacing[2]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[0.5]};
`;

const Name = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
`;

const Email = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.text.secondary};
`;

const Separator = styled(DropdownMenu.Separator)`
  height: 1px;
  background: ${({ theme }) => theme.border.color.primary};
  margin: ${({ theme }) => theme.spacing[1]} 0;
`;

const Item = styled(DropdownMenu.Item)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  color: ${({ theme }) => theme.text.primary};
  text-decoration: none;
  cursor: pointer;
  outline: none;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &[data-highlighted],
  &:focus-visible {
    background: ${({ theme }) => theme.background.tertiary};
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const DangerItem = styled(Item)`
  color: ${({ theme }) => theme.colors.semantic.error[600]};

  &[data-highlighted],
  &:focus-visible {
    background: ${({ theme }) => theme.colors.semantic.error[50]};
    color: ${({ theme }) => theme.colors.semantic.error[700]};
  }
`;

export type NavUserMenuProps = {
  className?: string;
};

export const NavUserMenu: React.FC<NavUserMenuProps> = ({ className }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <TriggerButton type='button' aria-label={`User menu for ${fullName}`} className={className}>
          <Avatar name={fullName} src={user.profileImageUrl} size='sm' />
        </TriggerButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <Content sideOffset={8} align='end'>
          <Header>
            <Name>{fullName}</Name>
            <Email>{user.email}</Email>
          </Header>
          <Separator />
          <Item asChild>
            <Link to='/profile'>
              <MdPersonOutline />
              Profile
            </Link>
          </Item>
          <Item asChild>
            <Link to='/applications'>
              <MdOutlineDescription />
              My applications
            </Link>
          </Item>
          <Item asChild>
            <Link to='/profile?tab=settings'>
              <MdOutlineSettings />
              Settings
            </Link>
          </Item>
          <Item asChild>
            <Link to='/help'>
              <MdHelpOutline />
              Help
            </Link>
          </Item>
          <Separator />
          <DangerItem onSelect={handleLogout}>
            <MdLogout />
            Log out
          </DangerItem>
        </Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
