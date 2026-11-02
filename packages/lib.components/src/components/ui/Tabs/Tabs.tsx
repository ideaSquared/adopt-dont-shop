import React, { useId, useRef } from 'react';
import clsx from 'clsx';
import * as styles from './Tabs.css';

export type TabItem = {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
};

export type TabsProps = {
  tabs: ReadonlyArray<TabItem>;
  /** Id of the active tab. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist (or use `aria-labelledby`). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  'data-testid'?: string;
};

const targetIndex = (key: string, current: number, count: number): number | null => {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
};

/**
 * Accessible tabs following the WAI-ARIA APG tabs pattern with automatic activation:
 * Left/Right (wrapping) and Home/End move focus and select. Inactive panels stay mounted
 * but `hidden`, so form state survives switching tabs.
 */
export const Tabs = ({
  tabs,
  value,
  onChange,
  className,
  'data-testid': testId,
  ...aria
}: TabsProps) => {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index, tabs.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    tabRefs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div className={className} data-testid={testId}>
      <div
        className={styles.tabList}
        role='tablist'
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
      >
        {tabs.map((tab, index) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={el => {
                tabRefs.current[index] = el;
              }}
              type='button'
              role='tab'
              id={tabId(tab.id)}
              aria-selected={active}
              aria-controls={panelId(tab.id)}
              tabIndex={active ? 0 : -1}
              className={clsx(styles.tab, active && styles.tabActive)}
              onClick={() => onChange(tab.id)}
              onKeyDown={event => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map(tab => {
        const active = tab.id === value;
        return (
          <div
            key={tab.id}
            role='tabpanel'
            id={panelId(tab.id)}
            aria-labelledby={tabId(tab.id)}
            hidden={!active}
            // APG: the active tabpanel is focusable so keyboard users can reach non-interactive content.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={active ? 0 : undefined}
            className={styles.tabPanel}
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
};

Tabs.displayName = 'Tabs';
export default Tabs;
