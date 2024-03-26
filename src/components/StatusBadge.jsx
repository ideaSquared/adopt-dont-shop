import React from 'react';
import Badge from 'react-bootstrap/Badge';

const getBadgeVariant = (type, value) => {
	value = value.toLowerCase();
	if (type === 'loglevel') {
		switch (value) {
			case 'error':
				return 'danger';
			case 'warn':
				return 'warning';
			case 'info':
				return 'info';
			case 'debug':
				return 'secondary';
			default:
				return 'primary';
		}
	} else if (type === 'logservice') {
		// Assuming you want all service badges to be 'info', but you can customize this
		return 'info';
	} else if (type === 'misc') {
		return 'info';
	} else if (type === 'conversation') {
		switch (value) {
			case 'active':
				return 'info';
			case 'closed':
				return 'warning';
			default:
				return 'primary';
		}
	}
	return 'primary';
};

const StatusBadge = ({ type, value, caps = true }) => {
	const variant = getBadgeVariant(type, value);
	const displayValue = caps ? value.toUpperCase() : value; // Apply toUpperCase only if caps is true
	return <Badge bg={variant}>{displayValue}</Badge>;
};

export default StatusBadge;
