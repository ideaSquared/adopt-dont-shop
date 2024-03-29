import React from 'react';
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';

const RescueProfileForm = ({
	rescueProfile,
	handleRescueInfoChange,
	handleReferenceNumberSubmit,
	canEditRescueInfo,
	saveUpdates,
}) => {
	return (
		<Form>
			<Row>
				<Col md={4}>
					<Form.Group className='mb-3'>
						<Form.Label>Rescue name</Form.Label>
						<Form.Control
							type='text'
							name='rescueName'
							value={rescueProfile.rescueName}
							onChange={handleRescueInfoChange}
							disabled={!canEditRescueInfo}
						/>
					</Form.Group>
				</Col>
				<Col md={4}>
					<Form.Group className='mb-3'>
						<Form.Label>Rescue type</Form.Label>
						<Form.Control
							type='text'
							name='rescueType'
							value={rescueProfile.rescueType}
							disabled={true}
						/>
					</Form.Group>
				</Col>
				<Col md={4}>
					<Form.Group className='mb-3'>
						<Form.Label>Reference number</Form.Label>
						<InputGroup>
							<Form.Control
								type='text'
								placeholder='Enter reference number'
								name='referenceNumber'
								value={rescueProfile.referenceNumber || ''}
								onChange={handleRescueInfoChange}
								disabled={!canEditRescueInfo}
							/>
							<Button
								variant='outline-secondary'
								onClick={handleReferenceNumberSubmit}
								disabled={!canEditRescueInfo}
							>
								Submit for verification
							</Button>
						</InputGroup>
					</Form.Group>
				</Col>
			</Row>
			<Form.Group className='mb-3'>
				<Form.Label>Rescue address</Form.Label>
				<Form.Control
					type='text'
					name='rescueAddress'
					value={rescueProfile.rescueAddress || ''}
					onChange={handleRescueInfoChange}
					disabled={!canEditRescueInfo}
				/>
			</Form.Group>
			<Button
				variant='primary'
				className='mt-3'
				onClick={saveUpdates}
				disabled={!canEditRescueInfo}
			>
				Save changes
			</Button>
		</Form>
	);
};

export default RescueProfileForm;
