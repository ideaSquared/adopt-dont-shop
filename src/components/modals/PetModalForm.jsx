import React from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

const PetModalForm = ({
	show,
	handleClose,
	handleFormSubmit,
	petDetails,
	isEditMode,
	handlePetChange,
	refreshPets,
}) => {
	const handlePetSubmit = async (event) => {
		event.preventDefault();
		await createOrUpdatePet(editingPet, isEditMode)
			.then(() => {
				props.refreshPets(); // Call the passed callback function to refresh pets
				handleClose();
			})
			.catch(console.error);
	};

	return (
		<Modal show={show} onHide={handleClose}>
			<Form onSubmit={handleFormSubmit}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Row className='mb-3'>
						<Col xs={12} md={6}>
							<Form.Group>
								<Form.Label>Name</Form.Label>
								<Form.Control
									type='text'
									placeholder='Enter pet name'
									name='petName'
									value={petDetails.petName || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
						<Col xs={12} md={6}>
							<Form.Group>
								<Form.Label>Age</Form.Label>
								<Form.Control
									type='integer'
									placeholder="Enter pet's age"
									name='age'
									value={petDetails.age || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					<Row className='mb-3'>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Gender</Form.Label>
								<Form.Control
									as='select'
									name='gender'
									value={petDetails.gender || ''}
									onChange={handlePetChange}
								>
									<option value=''>Select gender...</option>
									<option value='Male'>Male</option>
									<option value='Female'>Female</option>
									<option value='Other'>Other</option>
									<option value='Unknown'>Unknown</option>
								</Form.Control>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Status</Form.Label>
								<Form.Control
									as='select'
									name='status'
									value={petDetails.status || ''}
									onChange={handlePetChange}
								>
									<option value=''>Select pet's status</option>
									<option value='Available'>Available</option>
									<option value='Reserved'>Reserved</option>
									<option value='Adoption Pending'>Adoption Pending</option>
									<option value='Adopted'>Adopted</option>
									<option value='Draft'>Draft</option>
									<option value='Quarantine'>Quarantine</option>
									<option value='On Hold'>On Hold</option>
									<option value='Not Available for Adoption'>
										Not Available for Adoption
									</option>
								</Form.Control>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Type</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's type"
									name='type'
									value={petDetails.type || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					{/* {<!-- Descriptions Row -->} */}
					<Row className='mb-3'>
						<Col xs={12}>
							<Form.Group>
								<Form.Label>Short Description</Form.Label>
								<Form.Control
									as='textarea'
									rows={2}
									placeholder='Enter a short description'
									name='shortDescription'
									value={petDetails.shortDescription || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					<Row className='mb-3'>
						<Col xs={12}>
							<Form.Group>
								<Form.Label>Long Description</Form.Label>
								<Form.Control
									as='textarea'
									rows={3}
									placeholder='Enter a detailed description'
									name='longDescription'
									value={petDetails.longDescription || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					{/* { <!-- Characteristics -->} */}
					{/* {<!-- Common Characteristics Row -->} */}
					<Row className='mb-3'>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Size</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's size"
									name='characteristics.common.size'
									value={petDetails.characteristics?.common?.size || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Temperament</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's temperament"
									name='characteristics.common.temperament'
									value={petDetails.characteristics?.common?.temperament || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Vaccination Status</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's vaccination status"
									name='characteristics.common.vaccination_status'
									value={
										petDetails.characteristics?.common?.vaccination_status || ''
									}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					{/* {<!-- Specific Characteristics Row -->} */}
					<Row className='mb-3'>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Breed</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's breed"
									name='characteristics.specific.breed'
									value={petDetails.characteristics?.specific?.breed || ''}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Activity Level</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's activity level"
									name='characteristics.specific.activity_level'
									value={
										petDetails.characteristics?.specific?.activity_level || ''
									}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
						<Col xs={12} md={4}>
							<Form.Group>
								<Form.Label>Intelligence Level</Form.Label>
								<Form.Control
									type='text'
									placeholder="Enter pet's intelligence level"
									name='characteristics.specific.intelligence_level'
									value={
										petDetails.characteristics?.specific?.intelligence_level ||
										''
									}
									onChange={handlePetChange}
								/>
							</Form.Group>
						</Col>
					</Row>
				</Modal.Body>
				<Modal.Footer>
					<Button variant='secondary' onClick={handlePetSubmit}>
						Close
					</Button>
					<Button variant='primary' type='submit'>
						Save Changes
					</Button>
				</Modal.Footer>
			</Form>
		</Modal>
	);
};

export default PetModalForm;
