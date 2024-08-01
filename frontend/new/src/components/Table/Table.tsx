import React from 'react';
import styled from 'styled-components';

interface TableProps {
	headers: string[];
	data: (string | number)[][];
}

const StyledTable = styled.table`
	width: 100%;
	margin-bottom: 1rem;
	color: #212529;
	border-collapse: collapse;
`;

const StyledTableHead = styled.thead`
	background-color: #f8f9fa;
`;

const StyledTableRow = styled.tr``;

const StyledTableHeader = styled.th`
	padding: 0.75rem;
	border: 1px solid #dee2e6;
	text-align: left;
	vertical-align: bottom;
`;

const StyledTableCell = styled.td`
	padding: 0.75rem;
	border: 1px solid #dee2e6;
	vertical-align: top;
`;

const Table: React.FC<TableProps> = ({ headers, data }) => {
	return (
		<StyledTable>
			<StyledTableHead>
				<StyledTableRow>
					{headers.map((header, index) => (
						<StyledTableHeader key={index}>{header}</StyledTableHeader>
					))}
				</StyledTableRow>
			</StyledTableHead>
			<tbody>
				{data.map((row, rowIndex) => (
					<StyledTableRow key={rowIndex}>
						{row.map((cell, cellIndex) => (
							<StyledTableCell key={cellIndex}>{cell}</StyledTableCell>
						))}
					</StyledTableRow>
				))}
			</tbody>
		</StyledTable>
	);
};

export default Table;
