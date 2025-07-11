import React from 'react';
import styled, { css, DefaultTheme } from 'styled-components';

export type ListGroupVariant = 'default' | 'flush' | 'bordered';
export type ListGroupSize = 'sm' | 'md' | 'lg';

interface ListGroupProps {
  items: string[];
  /**
   * Visual variant of the list
   */
  variant?: ListGroupVariant;
  /**
   * Size of the list items
   */
  size?: ListGroupSize;
  /**
   * Whether items are clickable/interactive
   */
  interactive?: boolean;
  /**
   * Click handler for list items
   */
  onItemClick?: (item: string, index: number) => void;
  /**
   * Custom render function for items
   */
  renderItem?: (item: string, index: number) => React.ReactNode;
  /**
   * Custom CSS class
   */
  className?: string;
  /**
   * Test ID for testing
   */
  'data-testid'?: string;
}

const getVariantStyles = (variant: ListGroupVariant, theme: DefaultTheme) => {
  const variants = {
    default: css`
      border: 1px solid ${theme.border.color.primary};
      border-radius: ${theme.border.radius.lg};
      overflow: hidden;
    `,
    flush: css`
      border: none;
      border-radius: 0;
    `,
    bordered: css`
      border: 1px solid ${theme.border.color.primary};
      border-radius: ${theme.border.radius.lg};
      overflow: hidden;

      li {
        border-bottom: 1px solid ${theme.border.color.primary};

        &:last-child {
          border-bottom: none;
        }
      }
    `,
  };
  return variants[variant];
};

const getSizeStyles = (size: ListGroupSize, theme: DefaultTheme) => {
  const sizes = {
    sm: css`
      li {
        padding: ${theme.spacing[2]} ${theme.spacing[3]};
        font-size: ${theme.typography.size.sm};
      }
    `,
    md: css`
      li {
        padding: ${theme.spacing[3]} ${theme.spacing[4]};
        font-size: ${theme.typography.size.base};
      }
    `,
    lg: css`
      li {
        padding: ${theme.spacing[4]} ${theme.spacing[5]};
        font-size: ${theme.typography.size.lg};
      }
    `,
  };
  return sizes[size];
};

const StyledListGroup = styled.ul<{
  $variant: ListGroupVariant;
  $size: ListGroupSize;
  $interactive: boolean;
}>`
  list-style-type: none;
  padding: 0;
  margin: 0;
  background: ${({ theme }) => theme.background.secondary};

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $size, theme }) => getSizeStyles($size, theme)}
`;

const StyledListGroupItem = styled.li<{
  $interactive: boolean;
  $variant: ListGroupVariant;
}>`
  color: ${({ theme }) => theme.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  transition: all ${({ theme }) => theme.transitions.fast};
  word-break: break-word;

  ${({ $variant }) =>
    $variant === 'flush' &&
    css`
      border-bottom: 1px solid ${({ theme }) => theme.border.color.primary};

      &:last-child {
        border-bottom: none;
      }
    `}

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;
      user-select: none;

      &:hover {
        background: ${theme.background.tertiary};
        color: ${theme.text.primary};
      }

      &:active {
        background: ${theme.colors.primary[50]};
        color: ${theme.colors.primary[700]};
      }

      &:focus-visible {
        outline: none;
        background: ${theme.background.tertiary};
        box-shadow: inset 0 0 0 2px ${theme.colors.primary[500]};
      }
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ListGroup: React.FC<ListGroupProps> = ({
  items,
  variant = 'default',
  size = 'md',
  interactive = false,
  onItemClick,
  renderItem,
  className,
  'data-testid': dataTestId,
}) => {
  const handleItemClick = (item: string, index: number) => {
    if (interactive && onItemClick) {
      onItemClick(item, index);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, item: string, index: number) => {
    if (interactive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleItemClick(item, index);
    }
  };

  return (
    <StyledListGroup
      className={className}
      $variant={variant}
      $size={size}
      $interactive={interactive}
      data-testid={dataTestId}
      role={interactive ? 'menu' : 'list'}
    >
      {items.map((item, index) => (
        <StyledListGroupItem
          key={index}
          $interactive={interactive}
          $variant={variant}
          onClick={() => handleItemClick(item, index)}
          onKeyDown={event => handleKeyDown(event, item, index)}
          tabIndex={interactive ? 0 : undefined}
          role={interactive ? 'menuitem' : 'listitem'}
          aria-label={typeof item === 'string' ? item : `Item ${index + 1}`}
        >
          {renderItem ? renderItem(item, index) : item}
        </StyledListGroupItem>
      ))}
    </StyledListGroup>
  );
};

export default ListGroup;
