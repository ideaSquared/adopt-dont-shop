import React from 'react';
import styled, { css } from 'styled-components';

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

const getSizeStyles = (size: 'sm' | 'md' | 'lg', theme: any) => {
  const sizes = {
    sm: css`
      font-size: ${theme.typography.size.sm};
      gap: ${theme.spacing[1]};
    `,
    md: css`
      font-size: ${theme.typography.size.base};
      gap: ${theme.spacing[2]};
    `,
    lg: css`
      font-size: ${theme.typography.size.lg};
      gap: ${theme.spacing[3]};
    `,
  };
  return sizes[size];
};

const BreadcrumbContainer = styled.nav<{ $size: 'sm' | 'md' | 'lg' }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-family: ${({ theme }) => theme.typography.family.sans};

  ${({ $size, theme }) => getSizeStyles($size, theme)}
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: inherit;
`;

const BreadcrumbItem = styled.li`
  display: flex;
  align-items: center;
  gap: inherit;
`;

const BreadcrumbLink = styled.a<{ $active: boolean; $disabled: boolean }>`
  color: ${({ theme, $active, $disabled }) =>
    $disabled ? theme.text.disabled : $active ? theme.text.primary : theme.text.secondary};
  text-decoration: none;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.weight.semibold : theme.typography.weight.normal};
  transition: all ${({ theme }) => theme.transitions.fast};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[1.5]};
  margin: -${({ theme }) => theme.spacing[1]} -${({ theme }) => theme.spacing[1.5]};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};

  ${({ $active, $disabled, theme }) =>
    !$active &&
    !$disabled &&
    css`
      &:hover {
        color: ${theme.text.primary};
        background: ${theme.background.tertiary};
      }

      &:focus-visible {
        outline: none;
        background: ${theme.background.tertiary};
        box-shadow: ${theme.shadows.focus};
      }
    `}

  ${({ $active }) =>
    $active &&
    css`
      cursor: default;
      pointer-events: none;
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const BreadcrumbButton = styled.button<{ $active: boolean; $disabled: boolean }>`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[1.5]};
  margin: -${({ theme }) => theme.spacing[1]} -${({ theme }) => theme.spacing[1.5]};
  color: ${({ theme, $active, $disabled }) =>
    $disabled ? theme.text.disabled : $active ? theme.text.primary : theme.text.secondary};
  font-family: inherit;
  font-size: inherit;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.weight.semibold : theme.typography.weight.normal};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.fast};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  cursor: ${({ $disabled, $active }) =>
    $disabled ? 'not-allowed' : $active ? 'default' : 'pointer'};

  ${({ $active, $disabled, theme }) =>
    !$active &&
    !$disabled &&
    css`
      &:hover {
        color: ${theme.text.primary};
        background: ${theme.background.tertiary};
      }

      &:focus-visible {
        outline: none;
        background: ${theme.background.tertiary};
        box-shadow: ${theme.shadows.focus};
      }
    `}

  ${({ $active }) =>
    $active &&
    css`
      pointer-events: none;
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.text.quaternary};
  user-select: none;
  font-weight: ${({ theme }) => theme.typography.weight.normal};
`;

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

const CollapsedIndicator = styled.span`
  color: ${({ theme }) => theme.text.quaternary};
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[1]};
  cursor: default;
`;

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = '/',
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
          <CollapsedIndicator>
            <EllipsisIcon />
          </CollapsedIndicator>
          {!isLast && <Separator>{separator}</Separator>}
        </React.Fragment>
      );
    }

    const content = item.href ? (
      <BreadcrumbLink
        href={item.href}
        $active={isActive}
        $disabled={!!item.disabled}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </BreadcrumbLink>
    ) : (
      <BreadcrumbButton
        onClick={item.onClick}
        $active={isActive}
        $disabled={!!item.disabled}
        aria-current={isActive ? 'page' : undefined}
        type='button'
      >
        {item.label}
      </BreadcrumbButton>
    );

    return (
      <React.Fragment key={index}>
        {content}
        {!isLast && <Separator>{separator}</Separator>}
      </React.Fragment>
    );
  };

  const renderHomeItem = () => {
    const homeContent = homeHref ? (
      <BreadcrumbLink href={homeHref} $active={false} $disabled={false} aria-label='Home'>
        <HomeIcon />
      </BreadcrumbLink>
    ) : (
      <BreadcrumbButton
        onClick={onHomeClick}
        $active={false}
        $disabled={false}
        aria-label='Home'
        type='button'
      >
        <HomeIcon />
      </BreadcrumbButton>
    );

    return (
      <React.Fragment>
        {homeContent}
        {displayItems.length > 0 && <Separator>{separator}</Separator>}
      </React.Fragment>
    );
  };

  return (
    <BreadcrumbContainer
      className={className}
      $size={size}
      aria-label='Breadcrumb navigation'
      data-testid={dataTestId}
    >
      <BreadcrumbList>
        <BreadcrumbItem>
          {showHome && renderHomeItem()}
          {displayItems.map((item, index) => renderBreadcrumbItem(item, index))}
        </BreadcrumbItem>
      </BreadcrumbList>
    </BreadcrumbContainer>
  );
};

Breadcrumbs.displayName = 'Breadcrumbs';

