import React from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '@adopt-dont-shop/lib.components';
import * as styles from './AdminSidebar.css';
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
  FiChevronLeft,
  FiChevronRight,
  FiActivity,
  FiLock,
  FiSliders,
  FiLayout,
  FiSend,
  FiHeart,
  FiFile,
} from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside className={styles.sidebarContainer({ collapsed })}>
      <div className={styles.sidebarHeader({ collapsed })}>
        <div className={styles.logo({ collapsed })}>
          <Logo size={32} showWordmark={!collapsed} darkBg />
        </div>
        {!collapsed && (
          <button className={styles.toggleButton} onClick={onToggle} aria-label='Toggle sidebar'>
            <FiChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className={styles.collapsedToggleRow}>
          <button className={styles.toggleButton} onClick={onToggle} aria-label='Expand sidebar'>
            <FiChevronRight size={16} />
          </button>
        </div>
      )}

      <nav className={styles.nav}>
        {/* Main Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>Main</div>
          <NavLink
            to='/'
            end
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiHome />
            <span className={styles.navLinkSpan({ collapsed })}>Dashboard</span>
          </NavLink>
          <NavLink
            to='/analytics'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiBarChart2 />
            <span className={styles.navLinkSpan({ collapsed })}>Analytics</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* Management Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>Management</div>
          <NavLink
            to='/users'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiUsers />
            <span className={styles.navLinkSpan({ collapsed })}>Users</span>
          </NavLink>
          <NavLink
            to='/rescues'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiShield />
            <span className={styles.navLinkSpan({ collapsed })}>Rescues</span>
          </NavLink>
          <NavLink
            to='/pets'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiHeart />
            <span className={styles.navLinkSpan({ collapsed })}>Pets</span>
          </NavLink>
          <NavLink
            to='/applications'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiFile />
            <span className={styles.navLinkSpan({ collapsed })}>Applications</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* Safety & Support Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>Safety &amp; Support</div>
          <NavLink
            to='/moderation'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiAlertTriangle />
            <span className={styles.navLinkSpan({ collapsed })}>Moderation</span>
          </NavLink>
          <NavLink
            to='/support'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiHelpCircle />
            <span className={styles.navLinkSpan({ collapsed })}>Support Tickets</span>
          </NavLink>
          <NavLink
            to='/messages'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiMessageSquare />
            <span className={styles.navLinkSpan({ collapsed })}>Messages</span>
          </NavLink>
          <NavLink
            to='/notifications/broadcast'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiSend />
            <span className={styles.navLinkSpan({ collapsed })}>Broadcast</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* Content Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>Content</div>
          <NavLink
            to='/content'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiLayout />
            <span className={styles.navLinkSpan({ collapsed })}>Content Management</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* System Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>System</div>
          <NavLink
            to='/configuration'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiSettings />
            <span className={styles.navLinkSpan({ collapsed })}>Configuration</span>
          </NavLink>
          <NavLink
            to='/field-permissions'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiSliders />
            <span className={styles.navLinkSpan({ collapsed })}>Field Permissions</span>
          </NavLink>
          <NavLink
            to='/audit'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiActivity />
            <span className={styles.navLinkSpan({ collapsed })}>Audit Logs</span>
          </NavLink>
          <NavLink
            to='/security'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiShield />
            <span className={styles.navLinkSpan({ collapsed })}>Security Center</span>
          </NavLink>
          <NavLink
            to='/reports'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiFileText />
            <span className={styles.navLinkSpan({ collapsed })}>Reports</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* Account Section */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>Account</div>
          <NavLink
            to='/account'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiLock />
            <span className={styles.navLinkSpan({ collapsed })}>Account Settings</span>
          </NavLink>
        </div>
      </nav>

      <div className={styles.sidebarFooter({ collapsed })}>
        <div className={styles.footerText({ collapsed })}>Admin Panel v1.0.0</div>
        <div className={styles.footerText({ collapsed })}>Adopt Don't Shop</div>
      </div>
    </aside>
  );
};
