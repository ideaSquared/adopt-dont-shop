import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { Container, Row, Col } from 'react-bootstrap';

// Assuming you have a functional component setup
const UserMessaging = () => {
	// Example items data
	const items = [
		{
			id: 1,
			title: 'List group item heading',
			date: 'Wed',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
			active: true,
		},
		{
			id: 2,
			title: 'List group item heading',
			date: 'Tues',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
		},
		{
			id: 3,
			title: 'List group item heading',
			date: 'Tues',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
		},
		{
			id: 4,
			title: 'List group item heading',
			date: 'Tues',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
		},
		{
			id: 5,
			title: 'List group item heading',
			date: 'Tues',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
		},
		{
			id: 6,
			title: 'List group item heading',
			date: 'Tues',
			content:
				'Some placeholder content in a paragraph below the heading and date.',
		},
	];

	return (
		<div
			className='d-flex flex-column align-items-stretch flex-shrink-0 bg-body-tertiary'
			style={{ width: '380px' }}
		>
			<Container className='p-3 border-bottom'>
				<Row className='align-items-center'>
					<Col>
						{/* Replace SVG with appropriate icon or omit */}
						<span className='fs-5 fw-semibold'>My messages</span>
					</Col>
				</Row>
			</Container>
			<ListGroup className='list-group-flush border-bottom scrollarea'>
				{items.map((item) => (
					<ListGroup.Item
						action
						key={item.id}
						className={`py-3 lh-sm ${item.active ? 'active' : ''}`}
						aria-current={item.active ? 'true' : undefined}
					>
						<div className='d-flex w-100 align-items-center justify-content-between'>
							<strong className='mb-1'>{item.title}</strong>
							<small className={item.active ? '' : 'text-body-secondary'}>
								{item.date}
							</small>
						</div>
						<div className='col-10 mb-1 small'>{item.content}</div>
					</ListGroup.Item>
				))}
			</ListGroup>
		</div>
	);
};

export default UserMessaging;
