import React, { useState } from 'react';
import { File, FileText, Mail } from 'lucide-react';
import { DropdownMenu } from '@adopt-dont-shop/lib.components';

type ExportButtonProps = {
  onExportCSV: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onEmailReport: () => Promise<void>;
  disabled?: boolean;
};

const ExportButton: React.FC<ExportButtonProps> = ({
  onExportCSV,
  onExportPDF,
  onEmailReport,
  disabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const run = async (handler: () => Promise<void>) => {
    setIsExporting(true);
    try {
      await handler();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu
      triggerLabel={isExporting ? 'Exporting...' : 'Export Report'}
      disabled={disabled || isExporting}
      align="end"
      items={[
        { label: 'Export as CSV', icon: <File size="1em" />, onClick: () => run(onExportCSV) },
        { label: 'Export as PDF', icon: <FileText size="1em" />, onClick: () => run(onExportPDF) },
        { label: 'Email Report', icon: <Mail size="1em" />, onClick: () => run(onEmailReport) },
      ]}
    />
  );
};

export default ExportButton;
