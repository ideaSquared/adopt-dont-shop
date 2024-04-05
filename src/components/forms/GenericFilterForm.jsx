import React from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';

const GenericFilterForm = ({ filters, onAddClick, canAdd }) => {
	return (
		<Row className='mb-3'>
			{filters.map((filter, index) => (
				<Col key={index} sm={6} md={filter.md}>
					{filter.type === 'text' && (
						<>
							<Form.Label>{filter.label}:</Form.Label>
							<Form.Control
								aria-label={filter.label}
								type='text'
								placeholder={filter.placeholder}
								value={filter.value}
								onChange={filter.onChange}
							/>
						</>
					)}
					{filter.type === 'select' && (
						<>
							<Form.Label>{filter.label}:</Form.Label>
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
						</>
					)}
					{filter.type === 'switch' && (
						<Form.Check
							type='switch'
							id={filter.id}
							label={filter.label}
							checked={filter.checked}
							onChange={filter.onChange}
						/>
					)}
				</Col>
			))}
			{onAddClick && (
				<Col md={3}>
					<Button
						variant='primary'
						onClick={onAddClick}
						disabled={!canAdd}
						className='w-100'
					>
						Add New
					</Button>
				</Col>
			)}
		</Row>
	);
};

export default GenericFilterForm;
