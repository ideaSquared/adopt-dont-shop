import React from 'react';
import { Button, DropdownMenu } from '@adopt-dont-shop/lib.components';
import { Download, File, FileText } from 'lucide-react';
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
  const label = isExporting ? 'Exporting...' : 'Export';

  return (
    <DropdownMenu
      triggerLabel={label}
      align='end'
      disabled={disabled || isExporting}
      header='Export as'
      trigger={
        <Button variant='outline' startIcon={<Download size='1em' />}>
          {label}
        </Button>
      }
      items={[
        {
          label: 'CSV',
          description: 'Spreadsheet-compatible',
          icon: <FileText size='1em' />,
          onClick: () => onExport('csv'),
        },
        {
          label: 'PDF',
          description: 'Formatted report',
          icon: <File size='1em' />,
          onClick: () => onExport('pdf'),
        },
      ]}
    />
  );
};
