import React from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';

const GenericFilterForm = ({ filters, onAddClick, canAdd }) => {
	return (
		<Row className='mb-3 align-items-center'>
			{filters.map((filter, index) => {
				switch (filter.type) {
					case 'text':
						return (
							<Col
								key={index}
								md={filter.md}
								className='d-flex align-items-center'
							>
								<Form.Label>{filter.label}</Form.Label>
								<Form.Control
									aria-label={filter.label}
									type='text'
									placeholder={filter.placeholder}
									value={filter.value}
									onChange={filter.onChange}
								/>
							</Col>
						);
					case 'select':
						return (
							<Col
								key={index}
								md={filter.md}
								className='d-flex align-items-center'
							>
								<Form.Label>{filter.label}</Form.Label>
								<Form.Select
									aria-label={filter.label}
									value={filter.value}
									onChange={filter.onChange}
								>
									{filter.options.map((option, idx) => (
										<option key={idx} value={option.value}>
											{option.label}
										</option>
									))}
								</Form.Select>
							</Col>
						);
					case 'switch':
						return (
							<Col
								key={index}
								md={filter.md}
								className='d-flex align-items-center'
							>
								<Form.Check
									type='switch'
									id={filter.id}
									label={filter.label}
									checked={filter.checked}
									onChange={filter.onChange}
								/>
							</Col>
						);
					case 'button':
						return (
							<Col
								key={index}
								md={filter.md}
								className='d-flex justify-content-end align-items-center'
							>
								<Button
									variant='primary'
									onClick={filter.onClick}
									disabled={filter.disabled}
									className='w-100'
								>
									{filter.label}
								</Button>
							</Col>
						);
					default:
						return null;
				}
			})}
		</Row>
	);
};

export default GenericFilterForm;
