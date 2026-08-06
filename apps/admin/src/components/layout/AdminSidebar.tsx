import { Logo, NavSidebar, type NavSidebarGroup } from '@adopt-dont-shop/lib.components';
import {
  FiHome,
  FiUsers,
  FiShield,
  FiMessageSquare,
  FiBarChart2,
  FiSettings,
  FiFileText,
  FiAlertTriangle,
  FiHelpCircle,
  FiActivity,
  FiLock,
  FiSliders,
  FiLayout,
  FiSend,
  FiHeart,
  FiFile,
  FiInbox,
} from 'react-icons/fi';

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
        { to: '/', label: 'Dashboard', icon: <FiHome />, end: true },
        { to: '/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        { to: '/users', label: 'Users', icon: <FiUsers /> },
        { to: '/rescues', label: 'Rescues', icon: <FiShield /> },
        { to: '/pets', label: 'Pets', icon: <FiHeart /> },
        { to: '/applications', label: 'Applications', icon: <FiFile /> },
      ],
    },
    {
      id: 'safety-support',
      label: 'Safety & Support',
      items: [
        {
          to: '/inbox',
          label: 'Inbox',
          icon: <FiInbox />,
          badge: myInboxCount,
          badgeAriaLabel: `${myInboxCount} items assigned to you`,
        },
        { to: '/moderation', label: 'Moderation', icon: <FiAlertTriangle /> },
        { to: '/support', label: 'Support Tickets', icon: <FiHelpCircle /> },
        { to: '/messages', label: 'Messages', icon: <FiMessageSquare /> },
        { to: '/notifications/broadcast', label: 'Broadcast', icon: <FiSend /> },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      items: [{ to: '/content-management', label: 'Content Management', icon: <FiLayout /> }],
    },
    {
      // System section — ordered by frequency-of-use (ADS-652).
      id: 'system',
      label: 'System',
      items: [
        { to: '/audit', label: 'Audit Logs', icon: <FiActivity /> },
        { to: '/security', label: 'Security Center', icon: <FiShield /> },
        { to: '/privacy-tools', label: 'Privacy Tools', icon: <FiLock /> },
        { to: '/configuration', label: 'Configuration', icon: <FiSettings /> },
        { to: '/field-permissions', label: 'Field Permissions', icon: <FiSliders /> },
        { to: '/reports', label: 'Reports', icon: <FiFileText /> },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      items: [{ to: '/account', label: 'Account Settings', icon: <FiLock /> }],
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
