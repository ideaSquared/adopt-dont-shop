import React from 'react';
import styled from 'styled-components';

interface BadgeProps {
	children: React.ReactNode;
	variant?: 'content' | 'success' | 'danger' | 'warning' | 'info' | null;
}

// Define the styled component with dynamic styles based on the variant prop
const StyledBadge = styled.span<{ variant: BadgeProps['variant'] }>`
	background-color: ${(props) => {
		switch (props.variant) {
			case 'success':
				return props.theme.background.success;
			case 'danger':
				return props.theme.background.danger;
			case 'warning':
				return props.theme.background.warning;
			case 'info':
				return props.theme.background.info;
			default:
				return props.theme.background.contrast;
		}
	}};
	color: ${(props) => {
		switch (props.variant) {
			case 'success':
				return props.theme.text.success;
			case 'danger':
				return props.theme.text.danger;
			case 'warning':
				return props.theme.text.warning;
			case 'info':
				return props.theme.text.info;
			default:
				return props.theme.text.contrast;
		}
	}};
	font-size: 0.875rem;
	font-weight: 500;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
`;

// Badge component using StyledBadge
const Badge: React.FC<BadgeProps> = ({ children, variant = 'content' }) => {
	return <StyledBadge variant={variant}>{children}</StyledBadge>;
};

export default Badge;
