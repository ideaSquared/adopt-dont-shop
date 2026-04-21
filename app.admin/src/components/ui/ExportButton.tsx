import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import type { ExportFormat } from '../../services/exportService';

type ExportButtonProps = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  isExporting?: boolean;
};

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerButton = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: ${props => (props.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props => (props.$disabled ? 0.6 : 1)};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  svg {
    font-size: 1rem;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 180px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: ${props => (props.$isOpen ? 'block' : 'none')};
  z-index: 1000;
  overflow: hidden;
`;

const DropdownHeader = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f3f4f6;
`;

const FormatItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 0.875rem;
  color: #111827;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f9fafb;
  }

  svg {
    font-size: 1rem;
    color: #6b7280;
    flex-shrink: 0;
  }
`;

const FormatLabel = styled.div`
  flex: 1;
`;

const FormatDesc = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

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

  return (
    <Container ref={containerRef}>
      <TriggerButton
        onClick={() => setIsOpen(prev => !prev)}
        $disabled={disabled || isExporting}
        disabled={disabled || isExporting}
        aria-haspopup='true'
        aria-expanded={isOpen}
        data-testid='export-button'
      >
        <FiDownload />
        {isExporting ? 'Exporting...' : 'Export'}
      </TriggerButton>

      <Dropdown $isOpen={isOpen} role='menu' aria-label='Export options'>
        <DropdownHeader>Export as</DropdownHeader>
        <FormatItem role='menuitem' onClick={() => handleExport('csv')} data-testid='export-csv'>
          <FiFileText />
          <FormatLabel>
            CSV
            <FormatDesc>Spreadsheet-compatible</FormatDesc>
          </FormatLabel>
        </FormatItem>
        <FormatItem role='menuitem' onClick={() => handleExport('pdf')} data-testid='export-pdf'>
          <FiFile />
          <FormatLabel>
            PDF
            <FormatDesc>Formatted report</FormatDesc>
          </FormatLabel>
        </FormatItem>
      </Dropdown>
    </Container>
  );
};
