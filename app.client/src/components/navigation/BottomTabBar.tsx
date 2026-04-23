import React from 'react';
import {
  MdChat,
  MdFavoriteBorder,
  MdOutlineSearch,
  MdSwipe,
} from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Badge } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { NavUserMenu } from './NavUserMenu';

const Bar = styled.nav`
  display: flex;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.background.primary};
  border-top: 1px solid ${({ theme }) => theme.border.color.primary};
  padding-bottom: env(safe-area-inset-bottom, 0);

  @media (min-width: 769px) {
    display: none;
  }
`;

const Tabs = styled.ul`
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
`;

const TabItem = styled.li`
  flex: 1;
  display: flex;
`;

const TabLink = styled(Link)<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[0.5]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[1]}`};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary[600] : theme.text.secondary)};
  font-size: ${({ theme }) => theme.typography.size.xs};
  text-decoration: none;
  position: relative;
  min-height: 56px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border.color.focus};
    outline-offset: -2px;
  }

  svg {
    font-size: 1.5rem;
  }
`;

const BadgeOverlay = styled.span`
  position: absolute;
  top: 6px;
  right: calc(50% - 20px);
  pointer-events: none;
`;

const MeTab = styled.li`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

type TabDef = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export const BottomTabBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { unreadMessageCount } = useChat();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const tabs: TabDef[] = [
    { to: '/discover', label: 'Discover', icon: <MdSwipe aria-hidden='true' /> },
    { to: '/search', label: 'Search', icon: <MdOutlineSearch aria-hidden='true' /> },
    { to: '/favorites', label: 'Favorites', icon: <MdFavoriteBorder aria-hidden='true' /> },
    {
      to: '/chat',
      label: 'Messages',
      icon: <MdChat aria-hidden='true' />,
      badge: unreadMessageCount,
    },
  ];

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Bar aria-label='Primary'>
      <Tabs>
        {tabs.map(tab => {
          const active = isActive(tab.to);
          const ariaLabel =
            tab.badge && tab.badge > 0 ? `${tab.label} (${tab.badge} unread)` : tab.label;
          return (
            <TabItem key={tab.to}>
              <TabLink
                to={tab.to}
                $active={active}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <BadgeOverlay>
                    <Badge variant='count' max={99}>
                      {tab.badge}
                    </Badge>
                  </BadgeOverlay>
                ) : null}
              </TabLink>
            </TabItem>
          );
        })}
        <MeTab>
          <NavUserMenu />
        </MeTab>
      </Tabs>
    </Bar>
  );
};
