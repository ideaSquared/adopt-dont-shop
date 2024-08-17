import React from 'react';
import { render, screen } from '@testing-library/react';
import ListGroup from './ListGroup';

describe('ListGroup', () => {
	it('renders correctly with items', () => {
		const items = ['Item 1', 'Item 2', 'Item 3'];

		render(<ListGroup items={items} />);

		// Ensure the list is in the document
		const list = screen.getByRole('list');
		expect(list).toBeInTheDocument();

		// Ensure the correct number of items are rendered
		const listItems = screen.getAllByRole('listitem');
		expect(listItems).toHaveLength(items.length);

		// Ensure the items contain the correct text
		items.forEach((item, index) => {
			expect(listItems[index]).toHaveTextContent(item);
		});
	});

	it('renders correctly with no items', () => {
		render(<ListGroup items={[]} />);

		// Ensure the list is in the document
		const list = screen.getByRole('list');
		expect(list).toBeInTheDocument();

		// Ensure no list items are rendered
		const listItems = screen.queryAllByRole('listitem');
		expect(listItems).toHaveLength(0);
	});
});
