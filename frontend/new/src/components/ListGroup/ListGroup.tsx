import React from 'react';
import styled from 'styled-components';

interface ListGroupProps {
	items: string[];
}

const StyledListGroup = styled.ul`
	list-style-type: none;
	padding: 0;
	margin: 0;
	border: 1px solid #e9ecef;
	border-radius: 0.25rem;
`;

const StyledListGroupItem = styled.li`
	padding: 0.75rem 1.25rem;
	border-bottom: 1px solid #e9ecef;

	&:last-child {
		border-bottom: 0;
	}
`;

const ListGroup: React.FC<ListGroupProps> = ({ items }) => {
	return (
		<StyledListGroup>
			{items.map((item, index) => (
				<StyledListGroupItem key={index}>{item}</StyledListGroupItem>
			))}
		</StyledListGroup>
	);
};

export default ListGroup;
