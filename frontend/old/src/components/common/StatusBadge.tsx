import React from 'react';

type BadgeType = 'loglevel' | 'logservice' | 'misc' | 'conversation';

interface StatusBadgeProps {
	type: BadgeType;
	value: string;
	caps?: boolean;
}

const getBadgeVariant = (type: BadgeType, value: string): string => {
	value = value.toLowerCase();
	if (type === 'loglevel') {
		switch (value) {
			case 'error':
				return 'bg-red-500 text-white';
			case 'warn':
				return 'bg-yellow-500 text-black';
			case 'info':
				return 'bg-blue-500 text-white';
			case 'debug':
				return 'bg-gray-500 text-white';
			default:
				return 'bg-blue-500 text-white';
		}
	} else if (type === 'logservice' || type === 'misc') {
		return 'bg-blue-500 text-white';
	} else if (type === 'conversation') {
		switch (value) {
			case 'active':
				return 'bg-blue-500 text-white';
			case 'closed':
				return 'bg-yellow-500 text-black';
			default:
				return 'bg-blue-500 text-white';
		}
	}
	return 'bg-blue-500 text-white';
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
	type,
	value,
	caps = true,
}) => {
	const variant = getBadgeVariant(type, value);
	const displayValue = caps ? value.toUpperCase() : value;
	return (
		<span className={`inline-block py-1 px-2 rounded ${variant}`}>
			{displayValue}
		</span>
	);
};

export default StatusBadge;
