import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Image } from 'react-bootstrap';
import PetService from '../../services/PetService';
import './PetModalForm.scss';

const PetModalForm = ({
	show,
	handleClose,
	petDetails,
	setPetDetails,
	isEditMode,
	refreshPets,
}) => {
	const [selectedFiles, setSelectedFiles] = useState([]);
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleFileChange = async (event) => {
		const files = Array.from(event.target.files);

		try {
			await PetService.uploadPetImages(petDetails.pet_id, files);
			await refreshPetDetails(); // This assumes refreshPetDetails properly updates petDetails including images
		} catch (error) {
			console.error('Error uploading files:', error);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);
		try {
			// Use the createOrUpdatePet service method for both creating and updating pets
			const response = await PetService.createOrUpdatePet(
				petDetails,
				isEditMode
			);

			// Assuming the response includes the saved pet details, adjust as needed
			const savedPet = response.data;

			if (selectedFiles.length > 0) {
				await PetService.uploadPetImages(savedPet.pet_id, selectedFiles);
			}

			refreshPets(); // Trigger parent component to refresh the pet list
			handleClose(); // Close the modal form
		} catch (error) {
			console.error('Error submitting pet details:', error);
			setError('Failed to submit pet details.');
		} finally {
			setIsLoading(false);
		}
	};

	const renderImagePreviews = () => {
		return selectedFiles.length > 0 ? (
			selectedFiles.map((file, index) => (
				<div key={index} className='image-preview'>
					<Image
						src={URL.createObjectURL(file)}
						alt='preview'
						className='w-100'
						fluid
					/>
				</div>
			))
		) : (
			<p>No files selected for upload.</p>
		);
	};

	const renderPetImages = () => {
		return (
			petDetails?.images?.map((image, index) => (
				<div
					key={index}
					style={{
						position: 'relative',
						display: 'inline-block',
						marginRight: '8px',
					}}
				>
					<Image src={fileUploadsPath + image} thumbnail />
					<Button
						onClick={() => handleRemoveImage(index)}
						style={{
							position: 'absolute',
							top: '0',
							right: '0',
							backgroundColor: 'red',
							color: 'white',
							border: 'none',
							borderRadius: '50%',
							cursor: 'pointer',
							padding: '0 6px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						X
					</Button>
				</div>
			)) || <p>No images available.</p>
		);
	};

	const refreshPetDetails = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const updatedPetDetails = await PetService.getPetById(petDetails?.pet_id);
			setPetDetails(updatedPetDetails.data);
		} catch (error) {
			console.error('Error fetching updated pet details:', error);
			setError('Failed to load updated pet details.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveImage = async (index) => {
		// Extract the filename of the image to be deleted
		const imageToDelete = petDetails.images[index];

		try {
			setIsLoading(true);

			// First, call the service to delete the image file and update the database
			await PetService.deletePetImages(petDetails.pet_id, [imageToDelete]);

			// Then, update the local state to reflect the change immediately for a better user experience
			const updatedImages = petDetails.images.filter((_, idx) => idx !== index);
			const updatedPetDetails = { ...petDetails, images: updatedImages };
			setPetDetails(updatedPetDetails);

			// Optionally, refresh the pet details to ensure the UI is in sync with the backend
			await refreshPetDetails();
		} catch (error) {
			console.error('Error deleting pet image:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal show={show} onHide={handleClose} size='lg'>
			<Form onSubmit={handleSubmit}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{isLoading && <div>Loading pet details...</div>}
					{error && <div className='text-danger'>{error}</div>}
					{!isLoading && !error && (
						<>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Pet Images</Form.Label>
										<div className='pet-images-container'>
											{/* Display a loading indicator when images are being fetched */}
											{isLoading && <p>Loading images...</p>}

											{/* Display an error message if there was an issue fetching the images */}
											{error && <p className='text-danger'>{imagesError}</p>}

											{/* Once loading is complete and if there's no error, check for images */}
											{!isLoading &&
												!error &&
												(petDetails?.images?.length > 0 ? (
													renderPetImages()
												) : (
													<p>No images available.</p>
												))}
										</div>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group controlId='formFileMultiple' className='mb-3'>
										<Form.Label>Upload images</Form.Label>
										<Form.Control
											type='file'
											multiple
											accept='image/*'
											onChange={handleFileChange}
										/>
									</Form.Group>
									{/* <div className='image-previews'>
										{selectedFiles.map((file, index) => (
											<div key={index} className='image-preview'>
												<Image
													src={URL.createObjectURL(file)}
													alt='preview'
													className='w-100'
													fluid
												/>
											</div>
										))}
									</div> */}
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Name</Form.Label>
										<Form.Control
											type='text'
											placeholder='Enter pet name'
											name='name'
											value={petDetails?.name || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													name: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Age</Form.Label>
										<Form.Control
											type='number'
											placeholder="Enter pet's age"
											name='age'
											value={petDetails?.age || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, age: e.target.value })
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={3}>
									<Form.Group>
										<Form.Label>Gender</Form.Label>
										<Form.Control
											as='select'
											name='gender'
											value={petDetails?.gender || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, gender: e.target.value })
											}
										>
											<option value=''>Select gender...</option>
											<option value='Male'>Male</option>
											<option value='Female'>Female</option>
											<option value='Other'>Other</option>
											<option value='Unknown'>Unknown</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={3}>
									<Form.Group>
										<Form.Label>Status</Form.Label>
										<Form.Control
											as='select'
											name='status'
											value={petDetails?.status || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, status: e.target.value })
											}
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
								<Col xs={12} md={3}>
									<Form.Group>
										<Form.Label>Type</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's type"
											name='type'
											value={petDetails?.type || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, type: e.target.value })
											}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={3}>
									<Form.Group>
										<Form.Label>Breed</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's breed"
											name='breed'
											value={petDetails?.breed || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													breed: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Short description</Form.Label>
										<Form.Control
											as='textarea'
											rows={2}
											placeholder='Enter a short description'
											name='short_description'
											value={petDetails?.short_description || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													short_description: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Long description</Form.Label>
										<Form.Control
											as='textarea'
											rows={3}
											placeholder='Enter a detailed description'
											name='long_description'
											value={petDetails?.long_description || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													long_description: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Vaccination status</Form.Label>
										<Form.Control
											as='select'
											name='vaccination_status'
											value={petDetails?.vaccination_status || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													vaccination_status: e.target.value,
												})
											}
										>
											<option value=''>Select vaccination status</option>
											<option value='Fully Vaccinated'>Fully Vaccinated</option>
											<option value='Partially Vaccinated'>
												Partially Vaccinated
											</option>
											<option value='Unvaccinated'>Unvaccinated</option>
											<option value='Booster Required'>Booster Required</option>
											<option value='Overdue for Vaccinations'>
												Overdue for Vaccinations
											</option>
											<option value='Medical Exemption'>
												Medical Exemption
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								{/* 
								
								 */}
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Temperament</Form.Label>
										<Form.Control
											as='select'
											name='temperament'
											value={petDetails?.temperament || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													temperament: e.target.value,
												})
											}
										>
											<option value=''>Select temperament</option>
											<option
												value='Confident and sociable: Thrives in social settings and
												adapts quickly to new situations'
											>
												Confident and sociable: Thrives in social settings and
												adapts quickly to new situations
											</option>
											<option
												value='Timid but warms up with patience: Needs a calm
												environment and gentle handling to gain confidence'
											>
												Timid but warms up with patience: Needs a calm
												environment and gentle handling to gain confidence
											</option>
											<option value='Highly trainable: Responds well to training and enjoys learning new tricks and commands'>
												Highly trainable: Responds well to training and enjoys
												learning new tricks and commands
											</option>
											<option value='Needs experienced owner: Best suited for adopters with previous pet ownership experience, especially with specific breeds or behaviors'>
												Needs experienced owner: Best suited for adopters with
												previous pet ownership experience, especially with
												specific breeds or behaviors
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Health</Form.Label>
										<Form.Control
											as='select'
											name='health'
											value={petDetails?.health || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													health: e.target.value,
												})
											}
										>
											<option value=''>Select pets health</option>
											<option value='Perfect health: No ongoing medical issues'>
												Perfect health: No ongoing medical issues
											</option>
											<option
												value='Special needs: Requires ongoing medical care or has
												physical limitations'
											>
												Special needs: Requires ongoing medical care or has
												physical limitations
											</option>
											<option value='Dietary restrictions: Needs a specific type of diet (e.g., grain-free, low-calorie)'>
												Dietary restrictions: Needs a specific type of diet
												(e.g., grain-free, low-calorie)
											</option>
											<option value='Senior pet: Older animals that may be less active but still need a loving home'>
												Senior pet: Older animals that may be less active but
												still need a loving home
											</option>
											<option value='Recently rehabilitated: Has recovered from an injury or illness and needs a supportive environment to maintain health'>
												Recently rehabilitated: Has recovered from an injury or
												illness and needs a supportive environment to maintain
												health
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Size</Form.Label>
										<Form.Control
											as='select'
											name='size'
											value={petDetails?.size || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													size: e.target.value,
												})
											}
										>
											<option value=''>Select pet size</option>
											<option value='Small (up to 9 kg): Suitable for apartments or smaller living spaces'>
												Small (up to 9 kg): Suitable for apartments or smaller
												living spaces
											</option>
											<option value='Medium (9-23 kg): A good fit for most homes, including those with yards'>
												Medium (9-23 kg): A good fit for most homes, including
												those with yards
											</option>
											<option value='Large (23-45 kg): Best suited for homes with ample space and a secure, large outdoor area'>
												Large (23-45 kg): Best suited for homes with ample space
												and a secure, large outdoor area
											</option>
											<option value='Extra-large (over 45 kg): Requires a spacious living environment and robust physical activity'>
												Extra-large (over 45 kg): Requires a spacious living
												environment and robust physical activity
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Grooming Needs</Form.Label>
										<Form.Control
											as='select'
											name='grooming_needs'
											value={petDetails?.grooming_needs || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													grooming_needs: e.target.value,
												})
											}
										>
											<option value=''>Select grooming needs</option>
											<option value='No grooming: They will groom themselves adequately'>
												No grooming: They will groom themselves adequately
											</option>
											<option value="Low maintenance: Requires basic grooming that's easy to manage">
												Low maintenance: Requires basic grooming that\'s easy to
												manage
											</option>
											<option value='Regular grooming needed: Needs frequent brushing and occasional professional grooming'>
												Regular grooming needed: Needs frequent brushing and
												occasional professional grooming
											</option>
											<option value='High maintenance: Requires extensive grooming routines and regular professional care'>
												High maintenance: Requires extensive grooming routines
												and regular professional care'
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Training & Socialization</Form.Label>
										<Form.Control
											as='select'
											name='vaccination_status'
											value={petDetails?.training_socialization || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													training_socialization: e.target.value,
												})
											}
										>
											<option value=''>
												Select training & socialization status
											</option>
											<option value='No training required: they are self trained animals'>
												No training required: they are self trained animals
											</option>
											<option value='Basic training completed: Knows fundamental commands like sit, stay, and come'>
												Basic training completed: Knows fundamental commands
												like sit, stay, and come
											</option>
											<option value='Obedience trained: Has received extensive training and responds well to commands'>
												Obedience trained: Has received extensive training and
												responds well to commands
											</option>
											<option value='Socialized with multiple species: Comfortable around various animals, including those outside its species'>
												Socialized with multiple species: Comfortable around
												various animals, including those outside its species
											</option>
											<option value='Needs socialization: Requires training and exposure to become comfortable around other pets and people'>
												Needs socialization: Requires training and exposure to
												become comfortable around other pets and people
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Commitment Level</Form.Label>
										<Form.Control
											as='select'
											name='vaccination_status'
											value={petDetails?.commitment_level || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													commitment_level: e.target.value,
												})
											}
										>
											<option value=''>Select commitment level</option>
											<option value='Ideal for first-time pet owners: Easygoing and adaptable to new pet parents'>
												Ideal for first-time pet owners: Easygoing and adaptable
												to new pet parents
											</option>
											<option value='Needs active lifestyle: Thrives in an energetic environment with lots of physical activities'>
												Needs active lifestyle: Thrives in an energetic
												environment with lots of physical activities
											</option>
											<option value='Suitable for relaxed lifestyle: Prefers a quieter, more laid-back environment with minimal disruption'>
												Suitable for relaxed lifestyle: Prefers a quieter, more
												laid-back environment with minimal disruption
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Other Pets</Form.Label>
										<Form.Control
											as='select'
											name='other_pets'
											value={petDetails?.other_pets || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													other_pets: e.target.value,
												})
											}
										>
											<option value=''>Select other pet preference</option>
											<option value='Prefers an only pet household'>
												Prefers an only pet household
											</option>
											<option value='Can coexist peacefully with cats'>
												Can coexist peacefully with cats
											</option>
											<option value='Can coexist peacefully with dogs'>
												Can coexist peacefully with dogs
											</option>
											<option value='Friendly with small animals (like rabbits, guinea pigs)'>
												Friendly with small animals (like rabbits, guinea pigs)
											</option>
											<option value='I would prefer to live with another specific type of pet (e.g., dogs, cats, birds)'>
												I would prefer to live with another specific type of pet
												(e.g., dogs, cats, birds)
											</option>
											<option value='I would prefer not to live with a specific type of pet (e.g., dogs, cats, birds)'>
												I would prefer not to live with a specific type of pet
												(e.g., dogs, cats, birds)
											</option>
											<option value='Needs to be adopted with my current animal companion'>
												Needs to be adopted with my current animal companion
											</option>
											<option value='Would enjoy being adopted with a companion but can adapt if alone'>
												Would enjoy being adopted with a companion but can adapt
												if alone
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Household</Form.Label>
										<Form.Control
											as='select'
											name='household'
											value={petDetails?.household || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													household: e.target.value,
												})
											}
										>
											<option value=''>Select household preference</option>
											<option value='Prefers living indoors'>
												Prefers living indoors
											</option>
											<option value='Needs to be strictly indoor due to health/safety reasons'>
												Needs to be strictly indoor due to health/safety reasons
											</option>
											<option value='Enjoys both indoor and outdoor environments'>
												Enjoys both indoor and outdoor environments
											</option>
											<option value='Prefers spending time outdoors'>
												Prefers spending time outdoors
											</option>
											<option value='Needs an outdoor space'>
												Needs an outdoor space
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Energy</Form.Label>
										<Form.Control
											as='select'
											name='energy'
											value={petDetails?.energy || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, energy: e.target.value })
											}
										>
											<option value=''>Select energy level</option>
											<option value='Full of energy and loves extensive playtime'>
												Full of energy and loves extensive playtime
											</option>
											<option value='Moderately active: Enjoys regular playtime and exercise'>
												Moderately active: Enjoys regular playtime and exercise
											</option>
											<option value='Shy and reserved; requires a quiet environment to open up'>
												Shy and reserved; requires a quiet environment to open
												up
											</option>
											<option value='Enjoys human company and prefers someone present most of the time'>
												Enjoys human company and prefers someone present most of
												the time
											</option>
											<option value='Independent and self-sufficient; comfortable being alone for parts of the day'>
												Independent and self-sufficient; comfortable being alone
												for parts of the day
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Family</Form.Label>
										<Form.Control
											as='select'
											name='family'
											value={petDetails?.family || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, family: e.target.value })
											}
										>
											<option value=''>Select family preference</option>
											<option value='Suitable for families with young children'>
												Suitable for families with young children
											</option>
											<option value='Best suited for families with teenagers'>
												Best suited for families with teenagers
											</option>
											<option value='Ideal for a household with older children or adults only'>
												Ideal for a household with older children or adults only
											</option>
											<option value='Prefers a single-adult household'>
												Prefers a single-adult household
											</option>
											<option value='Needs a quiet home, preferably without children'>
												Needs a quiet home, preferably without children
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
							</Row>
							{/* Add more form groups as needed based on your pet model's requirements */}
						</>
					)}
				</Modal.Body>

				<Modal.Footer>
					<Button variant='secondary' onClick={handleClose}>
						Close
					</Button>
					<Button variant='secondary' type='submit' onClick={handleSubmit}>
						Save Changes
					</Button>
				</Modal.Footer>
			</Form>
		</Modal>
	);
};

export default PetModalForm;
