import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	CheckboxInput,
	Table,
	Button,
} from '@adoptdontshop/components';
import { Pet } from '@adoptdontshop/libs/pets';
import PetsService from '@adoptdontshop/libs/pets/PetsService';

const Pets: React.FC = () => {
	const [pets, setPets] = useState<Pet[]>([]);
	const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [filterByType, setFilterByType] = useState<string | null>(null);

	useEffect(() => {
		const fetchedPets = PetsService.getPets();
		setPets(fetchedPets);
		setFilteredPets(fetchedPets);
	}, []);

	useEffect(() => {
		const filtered = pets.filter((pet) => {
			const matchesSearch =
				!searchTerm ||
				pet.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesType = !filterByType || pet.type === filterByType;
			return matchesSearch && matchesType;
		});
		setFilteredPets(filtered);
	}, [searchTerm, filterByType, pets]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFilterByType(e.target.value);
	};

	const serviceOptions = [
		{ value: '', label: 'All types' },
		...Array.from(new Set(pets.map((pet) => pet.type))).map((type) => ({
			value: type,
			label: type,
		})),
	];

	return (
		<div>
			<h1>Pets</h1>
			<FormInput label='Search by pet name'>
				<TextInput
					onChange={handleSearchChange}
					type='text'
					value={searchTerm || ''}
				/>
			</FormInput>
			<FormInput label='Filter by type'>
				<SelectInput
					onChange={handleFilterTypeChange}
					value={filterByType}
					options={serviceOptions}
				/>
			</FormInput>
			<Table>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Type</th>
						<th>Status</th>
						<th>Age</th>
						<th>Gender</th>
						<th>Breed</th>
						<th>Vaccination Status</th>
						<th>Temperament</th>
						<th>Health</th>
						<th>Size</th>
						<th>Grooming Needs</th>
						<th>Training & Socialization</th>
						<th>Commitment Level</th>
						<th>Other Pets</th>
						<th>Household</th>
						<th>Energy</th>
						<th>Family</th>
						<th>Distance</th>
						<th>Owner Info</th>
						<th>Ratings</th>
						<th>Application Count</th>
					</tr>
				</thead>
				<tbody>
					{filteredPets.map((pet) => (
						<tr key={pet.pet_id}>
							<td>{pet.pet_id}</td>
							<td>{pet.name}</td>
							<td>{pet.type}</td>
							<td>{pet.status}</td>
							<td>{pet.age}</td>
							<td>{pet.gender}</td>
							<td>{pet.breed}</td>
							<td>{pet.vaccination_status}</td>
							<td>{pet.temperament}</td>
							<td>{pet.health}</td>
							<td>{pet.size}</td>
							<td>{pet.grooming_needs}</td>
							<td>{pet.training_socialization}</td>
							<td>{pet.commitment_level}</td>
							<td>{pet.other_pets}</td>
							<td>{pet.household}</td>
							<td>{pet.energy}</td>
							<td>{pet.family}</td>
							<td>{pet.distance || 'N/A'}</td>
							<td>{pet.ownerInfo || 'No Info'}</td>
							<td>
								{pet.ratings ? (
									<div>
										<div>Love: {pet.ratings.love}</div>
										<div>Like: {pet.ratings.like}</div>
										<div>Dislike: {pet.ratings.dislike}</div>
									</div>
								) : (
									'No Ratings'
								)}
							</td>
							<td>{pet.application_count || 0}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Pets;
