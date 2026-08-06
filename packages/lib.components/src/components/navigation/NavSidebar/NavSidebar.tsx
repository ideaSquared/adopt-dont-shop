import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import clsx from 'clsx';

import * as styles from './NavSidebar.css';

export type NavSidebarItem = {
  /** Route path (react-router). */
  to: string;
  label: string;
  /** Leading icon — a React node (icon component or emoji string). */
  icon?: React.ReactNode;
  /** Numeric badge (e.g. unread count). Hidden when 0/undefined; capped at 99+. */
  badge?: number;
  /** Accessible label for the badge (e.g. "3 unread messages"). */
  badgeAriaLabel?: string;
  /** Exact-match the route, like react-router NavLink `end` (use for "/"). */
  end?: boolean;
};

export type NavSidebarGroup = {
  id: string;
  /** Optional section heading shown above the group's items. */
  label?: string;
  items: NavSidebarItem[];
};

export type NavSidebarProps = {
  groups: NavSidebarGroup[];
  /** Branding shown in the header (e.g. a `<Logo/>`). */
  header?: React.ReactNode;
  /** Footer content (e.g. user info + sign-out, or a version string). */
  footer?: React.ReactNode;
  /** Enables the desktop icon-only collapse control. */
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Controlled off-canvas drawer for narrow viewports; behaves as a modal dialog when open. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  ariaLabel?: string;
  className?: string;
  'data-testid'?: string;
};

const formatBadge = (value: number): string => (value > 99 ? '99+' : String(value));

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * NavSidebar — a shared left navigation sidebar for the staff-facing apps
 * (admin, rescue). Renders grouped `NavLink` items with active state, optional
 * numeric badges, an optional desktop collapse, and a controlled off-canvas
 * drawer on mobile that behaves as a modal dialog (focus trap, Escape to close,
 * focus restore, and auto-close on route change). Branding and footer are slots
 * so each app supplies its own logo / user block. Permission filtering is the
 * caller's responsibility — pass only the groups/items that should be visible.
 */
export const NavSidebar = ({
  groups,
  header,
  footer,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileClose,
  ariaLabel = 'Main navigation',
  className,
  'data-testid': testId,
}: NavSidebarProps) => {
  const { pathname } = useLocation();
  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const didMount = useRef(false);

  // Auto-close the drawer after navigating to a new route (skip initial mount).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (mobileOpen) {
      onMobileClose?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to path change only
  }, [pathname]);

  // Modal-dialog behaviour while the drawer is open on mobile: move focus to the
  // close button, restore it on close.
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
    const handle = setTimeout(() => closeButtonRef.current?.focus(), 0);
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
    const focusable = asideRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  const dialogProps = mobileOpen
    ? { role: 'dialog' as const, 'aria-modal': true as const, onKeyDown: handleKeyDown }
    : {};

  return (
    <>
      {mobileOpen ? (
        <div className={styles.overlay} aria-hidden='true' onClick={onMobileClose} />
      ) : null}

      <aside
        ref={asideRef}
        className={clsx(styles.sidebar({ collapsed, mobileOpen }), className)}
        aria-label={ariaLabel}
        data-testid={testId}
        {...dialogProps}
      >
        <div className={styles.header}>
          {header ? <div className={styles.headerBrand({ collapsed })}>{header}</div> : null}
          {collapsible ? (
            <button
              type='button'
              className={styles.collapseButton}
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? '›' : '‹'}
            </button>
          ) : null}
          <button
            type='button'
            ref={closeButtonRef}
            className={styles.mobileCloseButton}
            onClick={onMobileClose}
            aria-label='Close navigation menu'
          >
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {groups.map(group => {
            const headingId = `nav-group-${group.id}`;
            return (
              <div
                key={group.id}
                className={styles.group}
                role='group'
                aria-labelledby={group.label ? headingId : undefined}
              >
                {group.label && !collapsed ? (
                  <div id={headingId} className={styles.groupLabel}>
                    {group.label}
                  </div>
                ) : null}
                <ul className={styles.groupList}>
                  {group.items.map(item => {
                    const showBadge = typeof item.badge === 'number' && item.badge > 0;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          title={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            clsx(styles.link({ collapsed }), isActive && styles.linkActive)
                          }
                        >
                          {item.icon ? (
                            <span className={styles.icon} aria-hidden='true'>
                              {item.icon}
                            </span>
                          ) : null}
                          <span className={styles.label({ collapsed })}>{item.label}</span>
                          {showBadge ? (
                            <span
                              className={styles.badge({ collapsed })}
                              aria-label={item.badgeAriaLabel}
                            >
                              {formatBadge(item.badge as number)}
                            </span>
                          ) : null}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {footer ? <div className={styles.footer({ collapsed })}>{footer}</div> : null}
      </aside>
    </>
  );
};
