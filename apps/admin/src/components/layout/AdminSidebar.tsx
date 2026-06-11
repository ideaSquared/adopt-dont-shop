import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Logo } from '@adopt-dont-shop/lib.components';
import * as styles from './AdminSidebar.css';
import { useMyInboxCount } from '../../hooks/useMyInboxCount';
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
  FiInbox,
  FiX,
} from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  // Off-canvas drawer state for narrow viewports. Ignored on desktop, where
  // the sidebar is always visible (see AdminSidebar.css media queries).
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}) => {
  const { count: myInboxCount } = useMyInboxCount();
  const { pathname } = useLocation();
  // Auto-close the off-canvas drawer after navigating to a new route on
  // mobile. Skips the initial mount so the drawer can be opened freely.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  // ADS-743: drawer must behave as a modal dialog on mobile — trap focus,
  // close on Escape, move focus to the close button on open, and restore
  // focus to whatever was focused before opening (the hamburger trigger).
  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) {
      const toFocus = previouslyFocused.current;
      if (toFocus && document.body.contains(toFocus)) {
        toFocus.focus();
      }
      previouslyFocused.current = null;
      return;
    }
    const active = document.activeElement;
    previouslyFocused.current = active instanceof HTMLElement ? active : null;
    // Defer so the drawer mounts and the close button is focusable.
    const handle = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => clearTimeout(handle);
  }, [mobileOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!mobileOpen) {
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      onMobileClose?.();
      return;
    }
    if (event.key !== 'Tab' || !asideRef.current) {
      return;
    }
    const focusable = asideRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeEl = document.activeElement;
    if (!event.shiftKey && activeEl === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && activeEl === first) {
      event.preventDefault();
      last.focus();
    }
  };

  // Only apply dialog semantics while the drawer is open on mobile. Desktop
  // always-visible state should not be announced as a modal.
  const dialogProps = mobileOpen
    ? ({
        role: 'dialog' as const,
        'aria-modal': true as const,
        'aria-label': 'Main navigation',
        onKeyDown: handleKeyDown,
      } as const)
    : {};

  return (
    <aside
      ref={asideRef}
      className={styles.sidebarContainer({ collapsed, mobileOpen })}
      {...dialogProps}
    >
      <div className={styles.sidebarHeader({ collapsed })}>
        <div className={styles.logo({ collapsed })}>
          <Logo size={32} showWordmark={!collapsed} darkBg />
        </div>
        {!collapsed && (
          <button className={styles.toggleButton} onClick={onToggle} aria-label='Toggle sidebar'>
            <FiChevronLeft size={16} />
          </button>
        )}
        <button
          ref={closeButtonRef}
          className={styles.mobileCloseButton}
          onClick={onMobileClose}
          aria-label='Close navigation menu'
        >
          <FiX size={18} />
        </button>
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
            to='/inbox'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiInbox />
            <span className={styles.navLinkSpan({ collapsed })}>Inbox</span>
            {!collapsed && myInboxCount > 0 && (
              <span
                className={styles.navBadge}
                aria-label={`${myInboxCount} items assigned to you`}
                data-testid='inbox-my-queue-badge'
              >
                {myInboxCount}
              </span>
            )}
          </NavLink>
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
            to='/content-management'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiLayout />
            <span className={styles.navLinkSpan({ collapsed })}>Content Management</span>
          </NavLink>
        </div>

        <div className={styles.navDivider({ collapsed })} />

        {/* System Section — ordered by frequency-of-use (ADS-652) */}
        <div
          className={`${styles.navSection({ collapsed })} ${styles.navSectionPadding({ collapsed })}`}
        >
          <div className={styles.navSectionTitle({ collapsed })}>System</div>
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
            to='/privacy-tools'
            className={({ isActive }) =>
              styles.styledNavLink({ collapsed }) + (isActive ? ' active' : '')
            }
          >
            <FiLock />
            <span className={styles.navLinkSpan({ collapsed })}>Privacy Tools</span>
          </NavLink>
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
