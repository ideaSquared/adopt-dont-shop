import React, { useState } from 'react';
import { FiDownload, FiMail, FiFileText, FiFile } from 'react-icons/fi';
import * as styles from './ExportButton.css';

interface ExportButtonProps {
  onExportCSV: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onEmailReport: () => Promise<void>;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExportCSV,
  onExportPDF,
  onEmailReport,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<'csv' | 'pdf' | 'email' | null>(null);

  const handleExport = async (type: 'csv' | 'pdf' | 'email', handler: () => Promise<void>) => {
    setLoadingState(type);
    try {
      await handler();
    } finally {
      setLoadingState(null);
      setIsOpen(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-export-button]')) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.container} data-export-button>
      <button
        className={styles.trigger({ disabled })}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <FiDownload />
        <span>Export Report</span>
      </button>

      <div className={styles.dropdown({ isOpen })}>
        <button
          className={styles.exportOption({ loading: loadingState === 'csv' })}
          onClick={() => handleExport('csv', onExportCSV)}
        >
          {loadingState === 'csv' ? <div className={styles.loadingSpinner} /> : <FiFile />}
          <span className={styles.optionLabel}>Export as CSV</span>
        </button>

        <button
          className={styles.exportOption({ loading: loadingState === 'pdf' })}
          onClick={() => handleExport('pdf', onExportPDF)}
        >
          {loadingState === 'pdf' ? <div className={styles.loadingSpinner} /> : <FiFileText />}
          <span className={styles.optionLabel}>Export as PDF</span>
        </button>

        <button
          className={styles.exportOption({ loading: loadingState === 'email' })}
          onClick={() => handleExport('email', onEmailReport)}
        >
          {loadingState === 'email' ? <div className={styles.loadingSpinner} /> : <FiMail />}
          <span className={styles.optionLabel}>Email Report</span>
        </button>
      </div>
    </div>
  );
};

export default ExportButton;
