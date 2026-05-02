import React, { useState, useRef, useEffect } from 'react';
import * as styles from './ExportButton.css';
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import type { ExportFormat } from '../../services/exportService';

type ExportButtonProps = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  isExporting?: boolean;
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  disabled = false,
  isExporting = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleExport = (format: ExportFormat) => {
    setIsOpen(false);
    onExport(format);
  };

  const isDisabled = disabled || isExporting;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.triggerButton({ disabled: isDisabled })}
        onClick={() => setIsOpen(prev => !prev)}
        disabled={isDisabled}
        aria-haspopup='true'
        aria-expanded={isOpen}
        data-testid='export-button'
      >
        <FiDownload />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      <div className={styles.dropdown({ isOpen })} role='menu' aria-label='Export options'>
        <div className={styles.dropdownHeader}>Export as</div>
        <button className={styles.formatItem} role='menuitem' onClick={() => handleExport('csv')} data-testid='export-csv'>
          <FiFileText />
          <div className={styles.formatLabel}>
            CSV
            <div className={styles.formatDesc}>Spreadsheet-compatible</div>
          </div>
        </button>
        <button className={styles.formatItem} role='menuitem' onClick={() => handleExport('pdf')} data-testid='export-pdf'>
          <FiFile />
          <div className={styles.formatLabel}>
            PDF
            <div className={styles.formatDesc}>Formatted report</div>
          </div>
        </button>
      </div>
    </div>
  );
};
