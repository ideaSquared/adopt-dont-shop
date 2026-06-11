import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import * as styles from './EntityInspector.css';

export type EntityInspectorTab = {
  /** Stable identifier for the tab — used as React key and for default selection. */
  id: string;
  /** Visible label. */
  label: string;
  /** Tab body. Rendered when the tab is active; pre-mounted tabs are an explicit opt-in. */
  content: React.ReactNode;
};

export type EntityInspectorProps = {
  /**
   * Slot rendered on the left of the header — avatar, name, badges, etc.
   * Pure presentation; the inspector imposes no shape on the entity.
   */
  header: React.ReactNode;
  /**
   * Ordered list of tabs. The first tab is selected by default unless
   * `defaultTabId` is supplied.
   */
  tabs: ReadonlyArray<EntityInspectorTab>;
  /** Tab to select when the inspector first renders. Falls back to `tabs[0]`. */
  defaultTabId?: string;
  /** Resets the active tab back to `defaultTabId` (or `tabs[0]`) when this value changes. */
  resetTabsOnKeyChange?: string | number;
  /** Called when the user clicks the close button. Omit to hide the close button. */
  onClose?: () => void;
  /** Accessible label for the close button. */
  closeLabel?: string;
  className?: string;
  'data-testid'?: string;
};

const resolveDefaultTabId = (
  tabs: ReadonlyArray<EntityInspectorTab>,
  preferred?: string
): string | null => {
  if (preferred && tabs.some(tab => tab.id === preferred)) {
    return preferred;
  }
  return tabs[0]?.id ?? null;
};

export const EntityInspector: React.FC<EntityInspectorProps> = ({
  header,
  tabs,
  defaultTabId,
  resetTabsOnKeyChange,
  onClose,
  closeLabel = 'Close inspector',
  className,
  'data-testid': testId,
}) => {
  const [activeTabId, setActiveTabId] = useState<string | null>(() =>
    resolveDefaultTabId(tabs, defaultTabId)
  );

  // Reset selection when the inspected entity changes. Callers pass the
  // entity id via resetTabsOnKeyChange so switching rows in a split-pane
  // list doesn't leave a stale tab open.
  useEffect(() => {
    setActiveTabId(resolveDefaultTabId(tabs, defaultTabId));
  }, [resetTabsOnKeyChange, defaultTabId, tabs]);

  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? null;

  return (
    <div className={clsx(styles.panel, className)} data-testid={testId}>
      <div className={styles.header}>
        <div className={styles.headerSlot}>{header}</div>
        {onClose && (
          <button
            type='button'
            className={styles.closeButton}
            onClick={onClose}
            aria-label={closeLabel}
          >
            {/* Plain unicode times — keeps lib.components free of icon deps */}
            &#x2715;
          </button>
        )}
      </div>

      <div className={styles.tabBar} role='tablist'>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              aria-controls={`entity-inspector-panel-${tab.id}`}
              id={`entity-inspector-tab-${tab.id}`}
              className={clsx(styles.tab, isActive && styles.tabActive)}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className={styles.tabContent}
        role='tabpanel'
        id={activeTab ? `entity-inspector-panel-${activeTab.id}` : undefined}
        aria-labelledby={activeTab ? `entity-inspector-tab-${activeTab.id}` : undefined}
      >
        {activeTab?.content ?? null}
      </div>
    </div>
  );
};
