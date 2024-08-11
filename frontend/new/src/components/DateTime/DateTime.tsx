import React from 'react';
import styled from 'styled-components';
import * as Tooltip from '@radix-ui/react-tooltip';

interface DateTimeProps {
	timestamp: string; // Expecting an ISO string or similar timestamp
	localeOption?: 'en-GB' | 'en-US';
}

const DateTime: React.FC<DateTimeProps> = ({
	timestamp,
	localeOption = 'en-GB',
}) => {
	const date = new Date(timestamp);

	// Function to get the ordinal suffix for a day
	const getOrdinalSuffix = (day: number): string => {
		if (day > 3 && day < 21) return 'th'; // Special case for 11th, 12th, 13th
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

	// Get the day with the ordinal suffix
	const day = date.getUTCDate();
	const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;

	// Get the month name and year
	const month = date.toLocaleString(localeOption, {
		month: 'long',
		timeZone: 'UTC',
	});
	const year = date.getUTCFullYear();

	// Get the time (hour and minute)
	const hours = date.getUTCHours().toString().padStart(2, '0');
	const minutes = date.getUTCMinutes().toString().padStart(2, '0');

	// Format the final string without "at"
	const formattedDate = `${dayWithSuffix} ${month} ${year}, ${hours}:${minutes}`;

	return (
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<ClickableTime dateTime={timestamp}>
						{formattedDate} UTC
					</ClickableTime>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<TooltipContent side='top' align='center'>
						<ClocksContainer>
							<Clock
								timezone='local'
								label='Local Time'
								timestamp={timestamp}
							/>
							<Clock timezone='UTC' label='UTC' timestamp={timestamp} />
							<Clock
								timezone='America/New_York'
								label='New York'
								timestamp={timestamp}
							/>
						</ClocksContainer>
						<TooltipArrow />
					</TooltipContent>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	);
};

const ClickableTime = styled.time`
	cursor: pointer;
	text-decoration: underline;
	color: blue;
`;

const ClocksContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const Clock: React.FC<{
	timezone: string;
	label: string;
	timestamp: string;
}> = ({ timezone, label, timestamp }) => {
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
		hour12: false,
		timeZone: timezone === 'local' ? undefined : timezone,
	};

	const formattedDate = date.toLocaleDateString('en-GB', dateOptions);
	const formattedTime = date.toLocaleTimeString('en-GB', timeOptions);

	return (
		<ClockContainer>
			<strong>{label}:</strong> {formattedDate}, {formattedTime}{' '}
			{timezone === 'UTC' ? 'UTC' : ''}
		</ClockContainer>
	);
};

const ClockContainer = styled.div`
	background-color: #f9fafb;
	padding: 10px;
	border-radius: 5px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TooltipContent = styled(Tooltip.Content)`
	background-color: white;
	padding: 10px;
	border-radius: 8px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	font-size: 14px;
	z-index: 10;
`;

const TooltipArrow = styled(Tooltip.Arrow)`
	fill: white;
`;

export default DateTime;
