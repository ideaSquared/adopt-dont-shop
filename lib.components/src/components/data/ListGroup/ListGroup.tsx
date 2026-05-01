import React from 'react';
import clsx from 'clsx';
import { listGroup, listGroupItem } from './ListGroup.css';

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
    <ul
      className={clsx(listGroup({ variant, size }), className)}
      data-testid={dataTestId}
      role={interactive ? 'menu' : 'list'}
    >
      {items.map((item, index) =>
        interactive ? (
          <li
            key={index}
            className={listGroupItem({ variant, interactive: true })}
            onClick={() => handleItemClick(item, index)}
            onKeyDown={event => handleKeyDown(event, item, index)}
            tabIndex={0}
            role='menuitem'
            aria-label={typeof item === 'string' ? item : `Item ${index + 1}`}
          >
            {renderItem ? renderItem(item, index) : item}
          </li>
        ) : (
          <li
            key={index}
            className={listGroupItem({ variant, interactive: false })}
            aria-label={typeof item === 'string' ? item : `Item ${index + 1}`}
          >
            {renderItem ? renderItem(item, index) : item}
          </li>
        )
      )}
    </ul>
  );
};

export default ListGroup;
