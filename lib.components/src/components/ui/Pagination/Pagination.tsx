import React from 'react';
import styled, { css, DefaultTheme } from 'styled-components';

export type PaginationSize = 'sm' | 'md' | 'lg';
export type PaginationVariant = 'default' | 'outlined' | 'minimal';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  size?: PaginationSize;
  variant?: PaginationVariant;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  siblingCount?: number;
  boundaryCount?: number;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  onPageChange: (page: number) => void;
}

const getSizeStyles = (size: PaginationSize) => {
  const sizes = {
    sm: css`
      height: 32px;
      min-width: 32px;
      padding: 0 8px;
      font-size: ${({ theme }) => theme.typography.size.sm};
    `,
    md: css`
      height: 40px;
      min-width: 40px;
      padding: 0 12px;
      font-size: ${({ theme }) => theme.typography.size.base};
    `,
    lg: css`
      height: 48px;
      min-width: 48px;
      padding: 0 16px;
      font-size: ${({ theme }) => theme.typography.size.lg};
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: PaginationVariant, theme: DefaultTheme, isActive: boolean) => {
  const variants = {
    default: css`
      background-color: ${isActive ? theme.colors.primary[500] : theme.colors.neutral[50]};
      border: 1px solid ${isActive ? theme.colors.primary[500] : theme.colors.neutral[300]};
      color: ${isActive ? theme.colors.neutral[50] : theme.colors.neutral[700]};

      &:hover:not(:disabled) {
        background-color: ${isActive ? theme.colors.primary[700] : theme.colors.neutral[50]};
        border-color: ${isActive ? theme.colors.primary[700] : theme.colors.neutral[400]};
      }
    `,
    outlined: css`
      background-color: transparent;
      border: 1px solid ${isActive ? theme.colors.primary[500] : theme.colors.neutral[300]};
      color: ${isActive ? theme.colors.primary[500] : theme.colors.neutral[700]};

      &:hover:not(:disabled) {
        background-color: ${isActive ? theme.colors.primary[100] + '20' : theme.colors.neutral[50]};
        border-color: ${theme.colors.primary[500]};
        color: ${theme.colors.primary[500]};
      }
    `,
    minimal: css`
      background-color: transparent;
      border: 1px solid transparent;
      color: ${isActive ? theme.colors.primary[500] : theme.colors.neutral[600]};

      &:hover:not(:disabled) {
        background-color: ${theme.colors.neutral[100]};
        color: ${theme.colors.neutral[700]};
      }

      ${isActive &&
      css`
        font-weight: ${theme.typography.weight.semibold};
      `}
    `,
  };
  return variants[variant];
};

const PaginationContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const PaginationButton = styled.button<{
  $size: PaginationSize;
  $variant: PaginationVariant;
  $isActive: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  text-decoration: none;

  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, theme, $isActive }) => getVariantStyles($variant, theme, $isActive)}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background-color: inherit;
      border-color: inherit;
      color: inherit;
    }
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const EllipsisIndicator = styled.span<{ $size: PaginationSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.neutral[500]};

  ${({ $size }) => getSizeStyles($size)}
`;

const PrevIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z'
      clipRule='evenodd'
    />
  </svg>
);

const NextIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
      clipRule='evenodd'
    />
  </svg>
);

const FirstIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z'
      clipRule='evenodd'
    />
  </svg>
);

const LastIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z'
      clipRule='evenodd'
    />
  </svg>
);

const createPaginationRange = (
  currentPage: number,
  totalPages: number,
  siblingCount: number,
  boundaryCount: number
): (number | string)[] => {
  // Total page numbers to show: current + siblings + boundaries + ellipsis indicators
  const totalPageNumbers = siblingCount + 5; // currentPage + siblings*2 + first + last + 1

  if (totalPageNumbers >= totalPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > boundaryCount + 1;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - boundaryCount;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 2 + 2 * siblingCount + boundaryCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 2 + 2 * siblingCount + boundaryCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, '...', ...rightRange];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, '...', ...middleRange, '...', totalPages];
  }

  return [];
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  size = 'md',
  variant = 'default',
  showFirstLast = false,
  showPrevNext = true,
  siblingCount = 1,
  boundaryCount = 1,
  disabled = false,
  className,
  'data-testid': testId,
  onPageChange,
}) => {
  const pages = createPaginationRange(currentPage, totalPages, siblingCount, boundaryCount);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !disabled) {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <PaginationContainer
      className={className}
      data-testid={testId}
      role='navigation'
      aria-label='Pagination'
    >
      {showFirstLast && (
        <PaginationButton
          $size={size}
          $variant={variant}
          $isActive={false}
          onClick={() => handlePageChange(1)}
          disabled={disabled || currentPage === 1}
          aria-label='Go to first page'
        >
          <FirstIcon />
        </PaginationButton>
      )}

      {showPrevNext && (
        <PaginationButton
          $size={size}
          $variant={variant}
          $isActive={false}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={disabled || currentPage === 1}
          aria-label='Go to previous page'
        >
          <PrevIcon />
        </PaginationButton>
      )}

      {pages.map((page, index) => {
        if (typeof page === 'number') {
          return (
            <PaginationButton
              key={page}
              $size={size}
              $variant={variant}
              $isActive={page === currentPage}
              onClick={() => handlePageChange(page)}
              disabled={disabled}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </PaginationButton>
          );
        }

        return (
          <EllipsisIndicator key={index} $size={size}>
            ...
          </EllipsisIndicator>
        );
      })}

      {showPrevNext && (
        <PaginationButton
          $size={size}
          $variant={variant}
          $isActive={false}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={disabled || currentPage === totalPages}
          aria-label='Go to next page'
        >
          <NextIcon />
        </PaginationButton>
      )}

      {showFirstLast && (
        <PaginationButton
          $size={size}
          $variant={variant}
          $isActive={false}
          onClick={() => handlePageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          aria-label='Go to last page'
        >
          <LastIcon />
        </PaginationButton>
      )}
    </PaginationContainer>
  );
};
