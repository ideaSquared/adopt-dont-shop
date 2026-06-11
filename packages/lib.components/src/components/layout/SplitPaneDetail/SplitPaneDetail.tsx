import clsx from 'clsx';
import React from 'react';

import * as styles from './SplitPaneDetail.css';

export type SplitPaneListItemRenderContext = {
  isSelected: boolean;
};

export type SplitPaneDetailProps<T> = {
  /** List of entities to display in the left pane. */
  items: ReadonlyArray<T>;
  /** Extracts a stable identifier from an item. */
  getItemId: (item: T) => string;
  /** Currently-selected item id, or `null` when nothing is selected. */
  selectedId: string | null;
  /** Called with the id of the row the user activated, or `null` when cleared. */
  onSelect: (id: string | null) => void;
  /** Renders one row of the list. The button wrapper, selection state, and click handling are owned by the component. */
  renderListItem: (item: T, context: SplitPaneListItemRenderContext) => React.ReactNode;
  /** Renders the detail pane for the selected item. */
  renderDetail: (item: T) => React.ReactNode;
  /** Shown in the detail pane when no item is selected. */
  emptyDetail?: React.ReactNode;
  /** Shown inside the list pane when `items` is empty. */
  emptyList?: React.ReactNode;
  /** Accessible label for the list region. Defaults to "Items". */
  listAriaLabel?: string;
  /** Accessible label for the detail region. Defaults to "Details". */
  detailAriaLabel?: string;
  /** Label for the back-to-list control shown on narrow viewports. */
  backLabel?: string;
  className?: string;
  'data-testid'?: string;
};

const SplitPaneDetailInner = <T,>({
  items,
  getItemId,
  selectedId,
  onSelect,
  renderListItem,
  renderDetail,
  emptyDetail,
  emptyList,
  listAriaLabel = 'Items',
  detailAriaLabel = 'Details',
  backLabel = 'Back to list',
  className,
  'data-testid': testId,
}: SplitPaneDetailProps<T>): React.ReactElement => {
  const selectedItem =
    selectedId === null ? null : (items.find(item => getItemId(item) === selectedId) ?? null);

  const detailOpen = selectedItem !== null;

  return (
    <div className={clsx(styles.root({ detailOpen }), className)} data-testid={testId}>
      <section
        className={styles.listPane({ hiddenOnNarrow: detailOpen })}
        aria-label={listAriaLabel}
      >
        {items.length === 0 ? (
          <div
            className={styles.emptyList}
            data-testid={testId ? `${testId}-empty-list` : undefined}
          >
            {emptyList ?? 'No items.'}
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map(item => {
              const id = getItemId(item);
              const isSelected = id === selectedId;
              return (
                <li key={id}>
                  <button
                    type='button'
                    className={styles.listItemButton({ selected: isSelected })}
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelect(id)}
                  >
                    {renderListItem(item, { isSelected })}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className={styles.detailPane({ visibleOnNarrow: detailOpen })}
        aria-label={detailAriaLabel}
      >
        {selectedItem === null ? (
          <div
            className={styles.emptyDetail}
            data-testid={testId ? `${testId}-empty-detail` : undefined}
          >
            {emptyDetail ?? 'Select an item to view details.'}
          </div>
        ) : (
          <>
            <button type='button' className={styles.backButton} onClick={() => onSelect(null)}>
              {backLabel}
            </button>
            {renderDetail(selectedItem)}
          </>
        )}
      </section>
    </div>
  );
};

// Re-export with a non-generic alias for ergonomic JSX usage while preserving the generic.
export const SplitPaneDetail = SplitPaneDetailInner as <T>(
  props: SplitPaneDetailProps<T>
) => React.ReactElement;
