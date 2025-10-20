import React, { useState } from 'react';
import styled from 'styled-components';
import { FiDownload, FiMail, FiFileText, FiFile } from 'react-icons/fi';

interface ExportButtonProps {
  onExportCSV: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onEmailReport: () => Promise<void>;
  disabled?: boolean;
}

const Container = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: ${props => props.$disabled
    ? props.theme.colors.neutral[300]
    : props.theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.6 : 1};

  &:hover {
    ${props => !props.$disabled && `
      background: ${props.theme.colors.primary[700]};
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    `}
  }

  &:active {
    ${props => !props.$disabled && `
      transform: translateY(0);
    `}
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral[200]};
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  padding: 0.5rem;
`;

const ExportOption = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  color: ${props => props.theme.text.primary};
  cursor: ${props => props.$loading ? 'wait' : 'pointer'};
  transition: all 0.2s ease;
  text-align: left;
  opacity: ${props => props.$loading ? 0.6 : 1};

  &:hover {
    ${props => !props.$loading && `
      background: ${props.theme.colors.neutral[100]};
      color: ${props.theme.colors.primary[700]};
    `}
  }

  svg {
    font-size: 1rem;
    flex-shrink: 0;
  }
`;

const OptionLabel = styled.span`
  flex: 1;
`;

const LoadingSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid ${props => props.theme.colors.neutral[300]};
  border-top-color: ${props => props.theme.colors.primary[600]};
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

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
    <Container data-export-button>
      <Trigger onClick={() => !disabled && setIsOpen(!isOpen)} $disabled={disabled}>
        <FiDownload />
        <span>Export Report</span>
      </Trigger>

      <Dropdown $isOpen={isOpen}>
        <ExportOption
          onClick={() => handleExport('csv', onExportCSV)}
          $loading={loadingState === 'csv'}
        >
          {loadingState === 'csv' ? <LoadingSpinner /> : <FiFile />}
          <OptionLabel>Export as CSV</OptionLabel>
        </ExportOption>

        <ExportOption
          onClick={() => handleExport('pdf', onExportPDF)}
          $loading={loadingState === 'pdf'}
        >
          {loadingState === 'pdf' ? <LoadingSpinner /> : <FiFileText />}
          <OptionLabel>Export as PDF</OptionLabel>
        </ExportOption>

        <ExportOption
          onClick={() => handleExport('email', onEmailReport)}
          $loading={loadingState === 'email'}
        >
          {loadingState === 'email' ? <LoadingSpinner /> : <FiMail />}
          <OptionLabel>Email Report</OptionLabel>
        </ExportOption>
      </Dropdown>
    </Container>
  );
};

export default ExportButton;
