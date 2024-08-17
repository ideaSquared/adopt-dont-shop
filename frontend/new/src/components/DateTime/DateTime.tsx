import React from 'react'
import styled from 'styled-components'
import * as Tooltip from '@radix-ui/react-tooltip'

interface DateTimeProps {
  /* A ISO or similar timestamp */
  timestamp: string
  localeOption?: 'en-GB' | 'en-US'
  showTooltip?: boolean
}

const DateTime: React.FC<DateTimeProps> = ({
  timestamp,
  localeOption = 'en-GB',
  showTooltip = false,
}) => {
  const date = new Date(timestamp)

  // Function to get the ordinal suffix for a day
  const getOrdinalSuffix = (day: number): string => {
    if (localeOption === 'en-US') return ''
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
      case 1:
        return 'st'
      case 2:
        return 'nd'
      case 3:
        return 'rd'
      default:
        return 'th'
    }
  }

  const day = date.getUTCDate()
  const dayWithSuffix =
    localeOption === 'en-US' ? day.toString() : `${day}${getOrdinalSuffix(day)}`

  const month = date.toLocaleString(localeOption, {
    month: 'long',
    timeZone: 'UTC',
  })
  const year = date.getUTCFullYear()

  const formattedDate =
    localeOption === 'en-US'
      ? `${month} ${day}, ${year}, ${date.toLocaleTimeString(localeOption, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })} UTC`
      : `${dayWithSuffix} ${month} ${year}, ${date.toLocaleTimeString(
          localeOption,
          { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' },
        )} UTC`

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <ClickableTime dateTime={timestamp}>
            {showTooltip && (
              <span role="img" aria-label="clock">
                🕒
              </span>
            )}
            {formattedDate}
          </ClickableTime>
        </Tooltip.Trigger>
        {showTooltip && (
          <Tooltip.Portal>
            <TooltipContent side="top" align="center">
              <ClocksContainer>
                <Clock
                  timezone="local"
                  label="Local Time"
                  timestamp={timestamp}
                  localeOption={localeOption}
                />
                <Clock
                  timezone="UTC"
                  label="UTC"
                  timestamp={timestamp}
                  localeOption={localeOption}
                />
                <Clock
                  timezone="America/New_York"
                  label="New York"
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
  )
}

const ClickableTime = styled.time`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`

const ClocksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Clock: React.FC<{
  timezone: string
  label: string
  timestamp: string
  localeOption: 'en-GB' | 'en-US'
}> = ({ timezone, label, timestamp, localeOption }) => {
  const date = new Date(timestamp)

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone === 'local' ? undefined : timezone,
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: localeOption === 'en-US', // en-US prefers 12-hour format
    timeZone: timezone === 'local' ? undefined : timezone,
  }

  const formattedDate = date.toLocaleDateString(localeOption, dateOptions)
  const formattedTime = date.toLocaleTimeString(localeOption, timeOptions)

  return (
    <ClockContainer>
      <strong>{label}:</strong> {formattedDate}, {formattedTime}{' '}
      {timezone === 'UTC' ? 'UTC' : ''}
    </ClockContainer>
  )
}

const ClockContainer = styled.div`
  background-color: #f9fafb;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const TooltipContent = styled(Tooltip.Content)`
  background-color: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  z-index: 10;
`

const TooltipArrow = styled(Tooltip.Arrow)`
  fill: white;
`

export default DateTime
