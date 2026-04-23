import React from 'react';
import styled from 'styled-components';

type Props = {
  name: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  iconFor: (option: string) => string;
  hasError?: boolean;
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const Tile = styled.label<{ $selected: boolean; $hasError: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  border-radius: 0.75rem;
  border: 2px solid
    ${({ $selected, $hasError, theme }) => {
      if ($selected) {
        return theme.colors.primary[500];
      }
      if ($hasError) {
        return theme.colors.semantic.error[400];
      }
      return theme.border.color.primary;
    }};
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[50] : theme.background.primary};
  cursor: pointer;
  text-align: center;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  min-height: 92px;

  &:hover {
    background: ${({ theme }) => theme.colors.primary[50]};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary[400]};
    outline-offset: 2px;
  }
`;

const HiddenRadio = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
`;

const Emoji = styled.span`
  font-size: 1.5rem;
  line-height: 1;
`;

const Label = styled.span<{ $selected: boolean }>`
  font-size: 0.8125rem;
  font-weight: ${props => (props.$selected ? 600 : 500)};
  color: ${({ $selected, theme }) => ($selected ? theme.colors.primary[700] : theme.text.primary)};
  line-height: 1.25;
`;

export const OptionTiles: React.FC<Props> = ({
  name,
  options,
  value,
  onChange,
  iconFor,
  hasError = false,
}) => (
  <Grid role='radiogroup'>
    {options.map(option => {
      const selected = value === option;
      return (
        <Tile key={option} $selected={selected} $hasError={hasError}>
          <HiddenRadio
            type='radio'
            name={name}
            value={option}
            checked={selected}
            onChange={() => onChange(option)}
          />
          <Emoji aria-hidden='true'>{iconFor(option)}</Emoji>
          <Label $selected={selected}>{option}</Label>
        </Tile>
      );
    })}
  </Grid>
);

/**
 * Per-question icon dictionaries. Keys map to lowercased option strings (with
 * em-dashes collapsed), values are emoji. Unknown keys should render via the
 * plain <select> fallback in QuestionField — these dictionaries only exist
 * for core keys where the mapping is unambiguous.
 */
const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/—/g, '-')
    .replace(/[^a-z0-9 -/]/g, '')
    .trim();

const ICON_BY_OPTION: Record<string, Record<string, string>> = {
  housing_type: {
    house: '🏠',
    'flat/apartment': '🏢',
    bungalow: '🏚️',
    'terraced house': '🏘️',
    'farmhouse/rural': '🚜',
    other: '🏡',
  },
  home_ownership: {
    own: '🔑',
    rent: '🧾',
    'live with family/parents': '👨‍👩‍👧',
    other: '🤔',
  },
  yard_size: {
    'no outdoor space': '🚫',
    'small (balcony/patio)': '🪴',
    'small garden': '🌱',
    'medium garden': '🌿',
    'large garden': '🌳',
    'very large/rural land': '🌄',
  },
  experience_level: {
    'first-time owner': '🌱',
    'some experience': '🌿',
    experienced: '🌳',
    'very experienced': '🏆',
  },
  pet_sleeping_location: {
    'indoors - own bed or crate': '🛏️',
    'indoors - bedroom with us': '🛌',
    'outdoors - shelter provided': '🏡',
    'will vary / not decided yet': '🤷',
  },
  hours_from_home: {
    'i work from home': '🏡',
    'less than 4 hours': '🕐',
    '4-6 hours': '🕓',
    '6-8 hours': '🕕',
    '8-10 hours': '🕗',
    'more than 10 hours': '🕙',
  },
  hours_alone: {
    'less than 2 hours': '🕐',
    '2-4 hours': '🕑',
    '4-6 hours': '🕓',
    '6-8 hours': '🕕',
    'more than 8 hours': '🕗',
  },
  employment_status: {
    'employed full-time': '💼',
    'employed part-time': '🕐',
    'self-employed': '💻',
    student: '🎓',
    retired: '🌴',
    homemaker: '🏠',
    'currently unemployed': '🔍',
    other: '✨',
  },
  pet_costs_prepared: {
    'yes - i have budgeted for all ongoing costs': '💰',
    'yes - i understand the costs involved': '👍',
    'mostly - i may need to research some costs further': '🧐',
    'im not fully sure what costs are involved': '🤔',
  },
};

export const hasIconMapping = (questionKey: string): boolean =>
  Object.prototype.hasOwnProperty.call(ICON_BY_OPTION, questionKey);

export const getIconFor =
  (questionKey: string) =>
  (option: string): string => {
    const dict = ICON_BY_OPTION[questionKey];
    if (!dict) {
      return '•';
    }
    return dict[normalise(option)] ?? '•';
  };
