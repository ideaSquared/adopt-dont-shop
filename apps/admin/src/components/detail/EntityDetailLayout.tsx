import React from 'react';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';

import * as styles from './splitPane.css';

/**
 * The canonical admin entity-detail (master-detail) layout: a list pane on the
 * left and an inline detail pane on the right, sharing one responsive
 * split-pane shell. Adopted by Users, Rescues, Pets and Applications (ADS-650)
 * so all four surfaces converge on a single pattern.
 *
 * The list pane hosts the rich `DataTable` (bulk select, pagination, sortable
 * columns, responsive card fallback) — capabilities the read-only shared
 * `SplitPaneDetail` cannot provide — while this component owns only the
 * two-pane shell, the narrow-viewport collapse, and the "Back to list" control.
 */
export type EntityDetailLayoutProps = {
  /** Left pane: the master list (filters, bulk toolbar, DataTable). */
  list: React.ReactNode;
  /** Right pane: the detail panel for the selected entity. Rendered only while `detailOpen`. */
  detail?: React.ReactNode;
  /** Whether an entity is selected and the detail pane should be shown. */
  detailOpen: boolean;
  /** Clears the current selection — wired to the narrow-viewport back control. */
  onBack: () => void;
  /** Accessible label for the back control. Defaults to "Back to list". */
  backLabel?: string;
};

export const EntityDetailLayout = ({
  list,
  detail,
  detailOpen,
  onBack,
  backLabel = 'Back to list',
}: EntityDetailLayoutProps) => (
  <div className={styles.splitLayout}>
    <div className={clsx(styles.listPane, detailOpen && styles.listPaneNarrow)}>{list}</div>

    {detailOpen && (
      <div className={styles.detailPane}>
        <button type='button' className={styles.backToList} onClick={onBack}>
          <ArrowLeft size='1em' aria-hidden /> {backLabel}
        </button>
        {detail}
      </div>
    )}
  </div>
);
