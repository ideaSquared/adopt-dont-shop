import React from 'react';
import clsx from 'clsx';

import {
  breadcrumbContainer,
  breadcrumbList,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbButton,
  separator,
  collapsedIndicator,
  activeItemStyles,
} from './Breadcrumbs.css';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  homeHref?: string;
  onHomeClick?: () => void;
  className?: string;
  'data-testid'?: string;
  /**
   * Maximum number of items to show before collapsing
   */
  maxItems?: number;
  /**
   * Size variant for the breadcrumbs
   */
  size?: 'sm' | 'md' | 'lg';
};

const HomeIcon = () => (
  <svg width='16' height='16' viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z'
      clipRule='evenodd'
    />
  </svg>
);

const EllipsisIcon = () => (
  <svg width='16' height='16' viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z' />
  </svg>
);

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator: separatorProp = '/',
  showHome = false,
  homeHref = '/',
  onHomeClick,
  className,
  'data-testid': dataTestId,
  maxItems,
  size = 'md',
}) => {
  // Handle item collapsing if maxItems is specified
  const displayItems =
    maxItems && items.length > maxItems
      ? [
          ...items.slice(0, 1),
          { label: '...', disabled: true } as BreadcrumbItem,
          ...items.slice(-(maxItems - 2)),
        ]
      : items;

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number) => {
    const isLast = index === displayItems.length - 1;
    const isActive = item.active || isLast;
    const isEllipsis = item.label === '...';

    if (isEllipsis) {
      return (
        <React.Fragment key={`ellipsis-${index}`}>
          <span className={collapsedIndicator}>
            <EllipsisIcon />
          </span>
          {!isLast && <span className={separator}>{separatorProp}</span>}
        </React.Fragment>
      );
    }

    // Render current (active) or disabled item as plain text (span), not a link or button
    if (isActive || item.disabled) {
      return (
        <React.Fragment key={index}>
          <span
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              isActive && activeItemStyles.active,
              item.disabled && activeItemStyles.disabled
            )}
          >
            {item.label}
          </span>
          {!isLast && <span className={separator}>{separatorProp}</span>}
        </React.Fragment>
      );
    }

    // Otherwise, render as link or button
    if (item.href) {
      return (
        <React.Fragment key={index}>
          <a href={item.href} className={breadcrumbLink({ active: false, disabled: false })}>
            {item.label}
          </a>
          {!isLast && <span className={separator}>{separatorProp}</span>}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={index}>
        <button
          onClick={item.onClick}
          className={breadcrumbButton({ active: false, disabled: false })}
          type='button'
        >
          {item.label}
        </button>
        {!isLast && <span className={separator}>{separatorProp}</span>}
      </React.Fragment>
    );
  };

  const renderHomeItem = () => {
    const homeContent = homeHref ? (
      <a
        href={homeHref}
        className={breadcrumbLink({ active: false, disabled: false })}
        aria-label='Home'
      >
        <HomeIcon />
      </a>
    ) : (
      <button
        onClick={onHomeClick}
        className={breadcrumbButton({ active: false, disabled: false })}
        aria-label='Home'
        type='button'
      >
        <HomeIcon />
      </button>
    );

    return (
      <React.Fragment>
        {homeContent}
        {displayItems.length > 0 && <span className={separator}>{separatorProp}</span>}
      </React.Fragment>
    );
  };

  return (
    <nav
      className={clsx(breadcrumbContainer({ size }), className)}
      aria-label='Breadcrumb navigation'
      data-testid={dataTestId}
    >
      <ol className={breadcrumbList}>
        {showHome && (
          <li className={breadcrumbItem} key='home'>
            {renderHomeItem()}
          </li>
        )}
        {displayItems.map((item, index) => (
          <li className={breadcrumbItem} key={index}>
            {renderBreadcrumbItem(item, index)}
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumbs.displayName = 'Breadcrumbs';
