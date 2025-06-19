import React from 'react';
import styled from 'styled-components';

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
};

const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const BreadcrumbItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const BreadcrumbLink = styled.a<{
  $active: boolean;
  $disabled: boolean;
}>`
  color: ${({ theme, $active, $disabled }) =>
    $disabled
      ? theme.colors.neutral[300]
      : $active
        ? theme.colors.neutral[900]
        : theme.colors.primary.main};
  text-decoration: ${({ $active }) => ($active ? 'none' : 'underline')};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.weight.medium : theme.typography.weight.normal};
  cursor: ${({ $disabled, $active }) =>
    $disabled ? 'not-allowed' : $active ? 'default' : 'pointer'};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme, $disabled, $active }) =>
      $disabled || $active ? 'inherit' : theme.colors.primary.dark};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.spacing.xs};
  }
`;

const BreadcrumbButton = styled.button<{
  $active: boolean;
  $disabled: boolean;
}>`
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme, $active, $disabled }) =>
    $disabled
      ? theme.colors.neutral[300]
      : $active
        ? theme.colors.neutral[900]
        : theme.colors.primary.main};
  text-decoration: ${({ $active }) => ($active ? 'none' : 'underline')};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.weight.medium : theme.typography.weight.normal};
  font-size: inherit;
  cursor: ${({ $disabled, $active }) =>
    $disabled ? 'not-allowed' : $active ? 'default' : 'pointer'};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme, $disabled, $active }) =>
      $disabled || $active ? 'inherit' : theme.colors.primary.dark};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.spacing.xs};
  }
`;

const BreadcrumbText = styled.span`
  color: ${({ theme }) => theme.colors.neutral[900]};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.neutral[400]};
  user-select: none;
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const HomeIcon = styled.span`
  display: inline-flex;
  align-items: center;

  &::before {
    content: '🏠';
    font-size: 14px;
  }
`;

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = '/',
  showHome = false,
  homeHref = '/',
  onHomeClick,
  className,
  'data-testid': dataTestId,
}) => {
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number) => {
    const isLast = index === items.length - 1;
    const isActive = item.active || isLast;

    const content = (() => {
      if (item.disabled || isActive) {
        return <BreadcrumbText>{item.label}</BreadcrumbText>;
      }

      if (item.href) {
        return (
          <BreadcrumbLink
            href={item.href}
            $active={isActive}
            $disabled={!!item.disabled}
            onClick={e => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
          >
            {item.label}
          </BreadcrumbLink>
        );
      }

      if (item.onClick) {
        return (
          <BreadcrumbButton onClick={item.onClick} $active={isActive} $disabled={!!item.disabled}>
            {item.label}
          </BreadcrumbButton>
        );
      }

      return <BreadcrumbText>{item.label}</BreadcrumbText>;
    })();

    return (
      <BreadcrumbItem key={index}>
        {content}
        {!isLast && <Separator>{separator}</Separator>}
      </BreadcrumbItem>
    );
  };

  const renderHomeItem = () => {
    if (onHomeClick) {
      return (
        <BreadcrumbButton onClick={onHomeClick} $active={false} $disabled={false}>
          <HomeIcon />
        </BreadcrumbButton>
      );
    }

    return (
      <BreadcrumbLink href={homeHref} $active={false} $disabled={false}>
        <HomeIcon />
      </BreadcrumbLink>
    );
  };

  return (
    <BreadcrumbContainer className={className} data-testid={dataTestId}>
      <BreadcrumbList>
        {showHome && (
          <BreadcrumbItem>
            {renderHomeItem()}
            {items.length > 0 && <Separator>{separator}</Separator>}
          </BreadcrumbItem>
        )}
        {items.map(renderBreadcrumbItem)}
      </BreadcrumbList>
    </BreadcrumbContainer>
  );
};
