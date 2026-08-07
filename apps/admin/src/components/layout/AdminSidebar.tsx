import { Logo, NavSidebar, type NavSidebarGroup } from '@adopt-dont-shop/lib.components';
import {
  Activity,
  ChartColumnIncreasing,
  CircleHelp,
  File,
  FileText,
  Heart,
  House,
  Inbox,
  Lock,
  MessageSquare,
  PanelsTopLeft,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { useMyInboxCount } from '../../hooks/useMyInboxCount';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  // Off-canvas drawer state for narrow viewports. Ignored on desktop, where
  // the sidebar is always visible (NavSidebar owns the responsive behaviour).
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export const AdminSidebar = ({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) => {
  const { count: myInboxCount } = useMyInboxCount();

  const groups: NavSidebarGroup[] = [
    {
      id: 'main',
      label: 'Main',
      items: [
        { to: '/', label: 'Dashboard', icon: <House size='1em' />, end: true },
        { to: '/analytics', label: 'Analytics', icon: <ChartColumnIncreasing size='1em' /> },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        { to: '/users', label: 'Users', icon: <Users size='1em' /> },
        { to: '/rescues', label: 'Rescues', icon: <Shield size='1em' /> },
        { to: '/pets', label: 'Pets', icon: <Heart size='1em' /> },
        { to: '/applications', label: 'Applications', icon: <File size='1em' /> },
      ],
    },
    {
      id: 'safety-support',
      label: 'Safety & Support',
      items: [
        {
          to: '/inbox',
          label: 'Inbox',
          icon: <Inbox size='1em' />,
          badge: myInboxCount,
          badgeAriaLabel: `${myInboxCount} items assigned to you`,
        },
        { to: '/moderation', label: 'Moderation', icon: <TriangleAlert size='1em' /> },
        { to: '/support', label: 'Support Tickets', icon: <CircleHelp size='1em' /> },
        { to: '/messages', label: 'Messages', icon: <MessageSquare size='1em' /> },
        { to: '/notifications/broadcast', label: 'Broadcast', icon: <Send size='1em' /> },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      items: [
        {
          to: '/content-management',
          label: 'Content Management',
          icon: <PanelsTopLeft size='1em' />,
        },
      ],
    },
    {
      // System section — ordered by frequency-of-use (ADS-652).
      id: 'system',
      label: 'System',
      items: [
        { to: '/audit', label: 'Audit Logs', icon: <Activity size='1em' /> },
        { to: '/security', label: 'Security Center', icon: <Shield size='1em' /> },
        { to: '/privacy-tools', label: 'Privacy Tools', icon: <Lock size='1em' /> },
        { to: '/configuration', label: 'Configuration', icon: <Settings size='1em' /> },
        {
          to: '/field-permissions',
          label: 'Field Permissions',
          icon: <SlidersHorizontal size='1em' />,
        },
        { to: '/reports', label: 'Reports', icon: <FileText size='1em' /> },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      items: [{ to: '/account', label: 'Account Settings', icon: <Lock size='1em' /> }],
    },
  ];

  return (
    <NavSidebar
      groups={groups}
      header={<Logo size={32} showWordmark={!collapsed} darkBg />}
      footer={
        <>
          <div>Admin Panel v1.0.0</div>
          <div>Adopt Don&apos;t Shop</div>
        </>
      }
      collapsible
      collapsed={collapsed}
      onToggleCollapsed={onToggle}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
      data-testid='admin-sidebar'
    />
  );
};
