import React, { ReactNode } from 'react';
import styled from 'styled-components';

interface TableProps {
	children: ReactNode;
}

const StyledTable = styled.table`
	width: 100%;
	margin-bottom: 1rem;
	color: #212529;
	border-collapse: collapse;
`;

const Table: React.FC<TableProps> = ({ children }) => {
	return <StyledTable>{children}</StyledTable>;
};

export default Table;
