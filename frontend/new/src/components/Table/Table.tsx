import React from 'react';
import styled, { css } from 'styled-components';

interface StyledTableProps {
	children: React.ReactNode;
	striped?: boolean;
	hasActions?: boolean;
}

const StyledTable = styled.table<StyledTableProps>`
	width: 100%;
	margin-bottom: 1rem;
	color: ${(props) => props.theme.text.body};
	border-collapse: collapse;
	border: 1px solid ${(props) => props.theme.border.content};

	th,
	td {
		padding: 0.75rem;
		text-align: left;
	}

	th {
		background-color: ${(props) => props.theme.background.content};
	}

	${(props) =>
		props.striped &&
		css`
			tr:nth-child(even) {
				background-color: ${props.theme.background.contrast};
			}
		`}

	tr:hover {
		background-color: ${(props) => props.theme.background.mouseHighlight};
	}

	${(props) =>
		props.hasActions &&
		css`
			td:last-child {
				display: flex;
				gap: 0.5rem;
			}
		`}
`;

const Table: React.FC<StyledTableProps> = ({
	children,
	striped = false,
	hasActions = false,
}) => {
	return (
		<StyledTable striped={striped} hasActions={hasActions}>
			{children}
		</StyledTable>
	);
};

export default Table;
