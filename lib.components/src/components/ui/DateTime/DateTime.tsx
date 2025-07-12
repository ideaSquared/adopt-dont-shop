import * as Tooltip from '@radix-ui/react-tooltip';
import React from 'react';
import styled from 'styled-components';

interface DateTimeProps {
  /* A ISO or similar timestamp */
  timestamp: string | Date;
  localeOption?: 'en-GB' | 'en-US';
  showTooltip?: boolean;
}

const DateTime: React.FC<DateTimeProps> = ({
  timestamp,
  localeOption = 'en-GB',
  showTooltip = false,
}) => {
  if (!timestamp) return;

  const date = new Date(timestamp);

  // Convert the date to an ISO string for dateTime attribute
  const dateTimeString = typeof timestamp === 'string' ? timestamp : date.toISOString();

  // Function to get the ordinal suffix for a day
  const getOrdinalSuffix = (day: number): string => {
    if (localeOption === 'en-US') return '';
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const day = date.getUTCDate();
  const dayWithSuffix =
    localeOption === 'en-US' ? day.toString() : `${day}${getOrdinalSuffix(day)}`;

  const month = date.toLocaleString(localeOption, {
    month: 'long',
    timeZone: 'UTC',
  });
  const year = date.getUTCFullYear();

  const formattedDate =
    localeOption === 'en-US'
      ? `${month} ${day}, ${year}, ${date.toLocaleTimeString(localeOption, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })} UTC`
      : `${dayWithSuffix} ${month} ${year}, ${date.toLocaleTimeString(localeOption, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })} UTC`;

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <ClickableTime dateTime={dateTimeString}>
            {showTooltip && (
              <span role='img' aria-label='clock'>
                🕒
              </span>
            )}
            {formattedDate}
          </ClickableTime>
        </Tooltip.Trigger>
        {showTooltip && (
          <Tooltip.Portal>
            <TooltipContent side='top' align='center'>
              <ClocksContainer>
                <Clock
                  timezone='local'
                  label='Local Time'
                  timestamp={timestamp}
                  localeOption={localeOption}
                />
                <Clock
                  timezone='UTC'
                  label='UTC'
                  timestamp={timestamp}
                  localeOption={localeOption}
                />
                <Clock
                  timezone='America/New_York'
                  label='New York'
                  timestamp={timestamp}
                  localeOption={localeOption}
                />
              </ClocksContainer>
              <TooltipArrow />
            </TooltipContent>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

const ClickableTime = styled.time`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ClocksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Clock: React.FC<{
  timezone: string;
  label: string;
  timestamp: string | Date;
  localeOption: 'en-GB' | 'en-US';
}> = ({ timezone, label, timestamp, localeOption }) => {
  if (!timestamp) return;

  const date = new Date(timestamp);

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone === 'local' ? undefined : timezone,
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: localeOption === 'en-US', // en-US prefers 12-hour format
    timeZone: timezone === 'local' ? undefined : timezone,
  };

  const formattedDate = date.toLocaleDateString(localeOption, dateOptions);
  const formattedTime = date.toLocaleTimeString(localeOption, timeOptions);

  return (
    <ClockContainer>
      <strong>{label}:</strong> {formattedDate}, {formattedTime} {timezone === 'UTC' ? 'UTC' : ''}
    </ClockContainer>
  );
};

const ClockContainer = styled.div`
  background-color: ${({ theme }) => theme.background.overlay};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.border.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const TooltipContent = styled(Tooltip.Content)`
  background-color: ${({ theme }) => theme.background.overlay};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.border.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  font-size: ${({ theme }) => theme.typography.size.sm};
  z-index: ${({ theme }) => theme.zIndex.tooltip};
`;

const TooltipArrow = styled(Tooltip.Arrow)`
  fill: ${({ theme }) => theme.background.overlay};
`;

export default DateTime;
