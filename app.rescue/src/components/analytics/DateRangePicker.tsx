import React, { useState } from 'react';
import styled from 'styled-components';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { DateRange } from '../../services/analyticsService';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: {
    label: string;
    getDates: () => DateRange;
  }[];
}

const Container = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral[300]};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary[400]};
    background: ${props => props.theme.colors.primary[50]};
  }

  svg {
    color: ${props => props.theme.text.secondary};
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
  min-width: 320px;
  display: ${props => props.$isOpen ? 'block' : 'none'};
`;

const PresetsSection = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.neutral[200]};
`;

const PresetButton = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  background: ${props => props.$active ? props.theme.colors.primary[50] : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary[700] : props.theme.text.primary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: ${props => props.$active ? '600' : '400'};

  &:hover {
    background: ${props => props.theme.colors.primary[50]};
    color: ${props => props.theme.colors.primary[700]};
  }
`;

const CustomSection = styled.div`
  padding: 1rem;
`;

const DateInputs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const DateInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const DateInput = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.neutral[300]};
  border-radius: 6px;
  font-size: 0.875rem;
  color: ${props => props.theme.text.primary};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[400]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const ApplyButton = styled.button`
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.625rem;
  background: ${props => props.theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[700]};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const defaultPresets = [
  {
    label: 'Last 7 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  {
    label: 'Last 30 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    },
  },
  {
    label: 'Last 90 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { start, end };
    },
  },
  {
    label: 'This month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    },
  },
  {
    label: 'Last month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end };
    },
  },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = defaultPresets,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start.toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(value.end.toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const formatDateRange = (range: DateRange) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${formatter.format(range.start)} - ${formatter.format(range.end)}`;
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    const newRange = preset.getDates();
    onChange(newRange);
    setActivePreset(preset.label);
    setCustomStart(newRange.start.toISOString().split('T')[0]);
    setCustomEnd(newRange.end.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start <= end) {
      onChange({ start, end });
      setActivePreset(null);
      setIsOpen(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-date-picker]')) {
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
    <Container data-date-picker>
      <Trigger onClick={() => setIsOpen(!isOpen)}>
        <FiCalendar />
        <span>{formatDateRange(value)}</span>
        <FiChevronDown />
      </Trigger>

      <Dropdown $isOpen={isOpen}>
        <PresetsSection>
          {presets.map((preset) => (
            <PresetButton
              key={preset.label}
              $active={activePreset === preset.label}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </PresetButton>
          ))}
        </PresetsSection>

        <CustomSection>
          <DateInputs>
            <DateInputGroup>
              <Label>Start Date</Label>
              <DateInput
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </DateInputGroup>

            <DateInputGroup>
              <Label>End Date</Label>
              <DateInput
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </DateInputGroup>
          </DateInputs>

          <ApplyButton onClick={handleCustomApply}>Apply Custom Range</ApplyButton>
        </CustomSection>
      </Dropdown>
    </Container>
  );
};

export default DateRangePicker;
