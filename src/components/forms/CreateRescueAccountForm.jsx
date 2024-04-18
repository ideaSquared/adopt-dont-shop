import React, { useState } from 'react';
import { Form, Row, Col, Button, Card } from 'react-bootstrap';

const customStyles = {
	option: (provided, state) => ({
		...provided,
		display: 'flex',
		alignItems: 'center',
		borderBottom: '1px dotted #ccc',
		padding: '10px 20px',
		color: state.isSelected ? 'black' : 'grey',
	}),
	control: (provided) => ({
		...provided,
		marginTop: '10px',
		marginBottom: '10px',
	}),
	singleValue: (provided, state) => ({
		...provided,
		display: 'flex',
		alignItems: 'center',
	}),
	placeholder: (provided) => ({
		...provided,
		display: 'flex',
		alignItems: 'center',
	}),
};

const optionWithImages = [
	{
		value: 'individual',
		label: (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<img
					src='/undraw/undraw_personal_file_re_5joy.svg'
					alt='Individual'
					style={{ width: '30px', marginRight: '10px' }}
				/>
				Individual seller
			</div>
		),
	},
	{
		value: 'charity',
		label: (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<img
					src='/undraw/undraw_gifts_0ceh.svg'
					alt='Charity'
					style={{ width: '30px', marginRight: '10px' }}
				/>
				Registered charity
			</div>
		),
	},
	{
		value: 'company',
		label: (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<img
					src='/undraw/undraw_businesswoman_re_5n6b.svg'
					alt='Company'
					style={{ width: '30px', marginRight: '10px' }}
				/>
				Registered company
			</div>
		),
	},
];

const CreateRescueAccountForm = ({
	onFirstNameChange,
	onLastNameChange,
	onEmailChange,
	onPasswordChange,
	onConfirmPasswordChange,
	onRescueTypeChange,
	rescueType,
	onRescueNameChange,
	onAddressLine1Change,
	onAddressLine2Change,
	onCityChange,
	onCountyChange,
	onPostcodeChange,
	onCountryChange,
	onCreateRescueAccount,
	onReferenceNumberChange,
	password,
	confirmPassword,
}) => {
	const [selectedType, setSelectedType] = useState('');

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;

	const selectRescueType = (type) => {
		setSelectedType(type);
		onRescueTypeChange(type);
	};

	const isSelected = (type) => (selectedType === type ? 'selected' : '');

	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onCreateRescueAccount();
			}}
		>
			<Row>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='firstName'>
						<Form.Label>First name</Form.Label>
						<Form.Control
							type='text'
							name='firstName'
							onChange={(e) => onFirstNameChange(e.target.value)}
							placeholder='Enter first name'
						/>
					</Form.Group>
				</Col>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='lastName'>
						<Form.Label>Last name</Form.Label>
						<Form.Control
							type='type'
							name='lastName'
							onChange={(e) => onLastNameChange(e.target.value)}
							placeholder='Enter last name'
						/>
					</Form.Group>
				</Col>
			</Row>

			<Row>
				<Col md={12}>
					<Form.Group className='mb-3' controlId='email'>
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type='email'
							name='email'
							onChange={(e) => onEmailChange(e.target.value)}
							placeholder='Enter email'
						/>
					</Form.Group>
				</Col>
				<Col md={6}></Col>
			</Row>

			<Row>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='password'>
						<Form.Label>Password</Form.Label>
						<Form.Control
							type='password'
							name='password'
							onChange={(e) => onPasswordChange(e.target.value)}
							placeholder='Enter your password'
						/>
					</Form.Group>
				</Col>
				<Col md={6}>
					<Form.Group controlId='formConfirmPassword'>
						<Form.Label>Confirm Password</Form.Label>
						<Form.Control
							type='password'
							onChange={(e) => onConfirmPasswordChange(e.target.value)}
							placeholder='Confirm your password'
							isInvalid={!passwordsMatch && confirmPassword}
						/>
						<Form.Control.Feedback type='invalid'>
							Passwords must match.
						</Form.Control.Feedback>
					</Form.Group>
				</Col>
			</Row>

			<hr />

			<Row className='text-center'>
				<Col md={3} className='mb-3'>
					<Button
						variant={isSelected('individual') ? 'primary' : 'light'}
						className={`d-block w-100 h-100 ${isSelected('individual')}`}
						onClick={() => selectRescueType('individual')}
					>
						<img
							src='/undraw/undraw_personal_file_re_5joy.svg'
							alt='Individual'
							style={{ width: '80%', margin: '10px 0' }}
						/>
						<p>Individual</p>
					</Button>
				</Col>
				<Col md={3} className='mb-3'>
					<Button
						variant={isSelected('charity') ? 'primary' : 'light'}
						className={`d-block w-100 h-100 ${isSelected('charity')}`}
						onClick={() => selectRescueType('charity')}
					>
						<img
							src='/undraw/undraw_gifts_0ceh.svg'
							alt='Charity'
							style={{ width: '80%', margin: '10px 0' }}
						/>
						<p>Charity</p>
					</Button>
				</Col>
				<Col md={3} className='mb-3'>
					<Button
						variant={isSelected('company') ? 'primary' : 'light'}
						className={`d-block w-100 h-100 ${isSelected('company')}`}
						onClick={() => selectRescueType('company')}
					>
						<img
							src='/undraw/undraw_businesswoman_re_5n6b.svg'
							alt='Company'
							style={{ width: '80%', margin: '10px 0' }}
						/>
						<p>Company</p>
					</Button>
				</Col>
				<Col md={3} className='mb-3'>
					<Button
						variant={isSelected('other') ? 'primary' : 'light'}
						className={`d-block w-100 h-100 ${isSelected('other')}`}
						onClick={() => selectRescueType('other')}
					>
						<img
							src='/undraw/undraw_questions_re_1fy7.svg'
							alt='Other'
							style={{ width: '80%', margin: '10px 0' }}
						/>
						<p>Other</p>
					</Button>
				</Col>
			</Row>

			<Row>
				{/* <Col md={6}>
					<Form.Group className='mb-3' controlId='rescueType'>
						<Form.Label>What type of rescue are you?</Form.Label>
						<Select
							options={optionWithImages}
							onChange={handleRescueTypeChange}
							styles={customStyles}
							defaultValue={optionWithImages.find(
								(option) => option.value === rescueType
							)}
						/>
					</Form.Group>
				</Col> */}
				<Col md={12}>
					{(rescueType === 'charity' || rescueType === 'company') && (
						<>
							<Form.Group className='mb-3' controlId='rescueName'>
								<Form.Label>Rescue name</Form.Label>
								<Form.Control
									type='text'
									name='rescueName'
									onChange={(e) => onRescueNameChange(e.target.value)}
									placeholder='Enter rescue name'
								/>
							</Form.Group>
							<Form.Group className='mb-3' controlId='referenceNumber'>
								<Form.Label>
									Reference number (Company House/Charity Register)
								</Form.Label>
								<Form.Control
									type='text'
									name='referenceNumber'
									onChange={(e) => onReferenceNumberChange(e.target.value)}
									placeholder='Enter reference number'
								/>
								<Form.Text className='text-muted'>
									Please enter the reference number as it appears in official
									records.
								</Form.Text>
							</Form.Group>
						</>
					)}
					{rescueType === 'other' && (
						<Card className='my-4'>
							<Card.Body>
								<Card.Text className='text-center'>
									<h4>
										I'm afraid we don't currently support other types of rescues
										- email us at help@adoptdontshop.app
									</h4>
								</Card.Text>
							</Card.Body>
						</Card>
					)}
				</Col>
			</Row>

			{/* <Row>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='addressLine1'>
						<Form.Label>Address Line 1</Form.Label>
						<Form.Control
							type='text'
							name='addressLine1'
							onChange={(e) => onAddressLine1Change(e.target.value)}
							placeholder='Street address, P.O. box, company name, c/o'
						/>
					</Form.Group>
				</Col>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='addressLine2'>
						<Form.Label>Address Line 2</Form.Label>
						<Form.Control
							type='text'
							name='addressLine2'
							onChange={(e) => onAddressLine2Change(e.target.value)}
							placeholder='Apartment, suite, unit, building, floor, etc.'
						/>
					</Form.Group>
				</Col>
			</Row> */}

			<Row>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='city'>
						<Form.Label>City</Form.Label>
						<Form.Control
							type='text'
							name='city'
							onChange={(e) => onCityChange(e.target.value)}
							placeholder='Enter your rescues city'
						/>
					</Form.Group>
				</Col>
				<Col md={6}>
					<Form.Group className='mb-3' controlId='country'>
						<Form.Label>Country</Form.Label>
						<Form.Control
							as='select'
							name='country'
							onChange={(e) => onCountryChange(e.target.value)}
							defaultValue='Select Country'
						>
							<option disabled value='Select Country'>
								Select Country
							</option>
							<option value='United Kingdom'>United Kingdom</option>
							<option value='United States'>United States</option>
							<option value='Ireland'>Ireland</option>
							<option value='Afghanistan'>Afghanistan</option>
							<option value='Åland Islands'>Åland Islands</option>
							<option value='Albania'>Albania</option>
							<option value='Algeria'>Algeria</option>
							<option value='American Samoa'>American Samoa</option>
							<option value='Andorra'>Andorra</option>
							<option value='Angola'>Angola</option>
							<option value='Anguilla'>Anguilla</option>
							<option value='Antarctica'>Antarctica</option>
							<option value='Antigua and Barbuda'>Antigua and Barbuda</option>
							<option value='Argentina'>Argentina</option>
							<option value='Armenia'>Armenia</option>
							<option value='Aruba'>Aruba</option>
							<option value='Australia'>Australia</option>
							<option value='Austria'>Austria</option>
							<option value='Azerbaijan'>Azerbaijan</option>
							<option value='Bahamas'>Bahamas</option>
							<option value='Bahrain'>Bahrain</option>
							<option value='Bangladesh'>Bangladesh</option>
							<option value='Barbados'>Barbados</option>
							<option value='Belarus'>Belarus</option>
							<option value='Belgium'>Belgium</option>
							<option value='Belize'>Belize</option>
							<option value='Benin'>Benin</option>
							<option value='Bermuda'>Bermuda</option>
							<option value='Bhutan'>Bhutan</option>
							<option value='Bolivia'>Bolivia</option>
							<option value='Bosnia and Herzegovina'>
								Bosnia and Herzegovina
							</option>
							<option value='Botswana'>Botswana</option>
							<option value='Bouvet Island'>Bouvet Island</option>
							<option value='Brazil'>Brazil</option>
							<option value='British Indian Ocean Territory'>
								British Indian Ocean Territory
							</option>
							<option value='Brunei Darussalam'>Brunei Darussalam</option>
							<option value='Bulgaria'>Bulgaria</option>
							<option value='Burkina Faso'>Burkina Faso</option>
							<option value='Burundi'>Burundi</option>
							<option value='Cambodia'>Cambodia</option>
							<option value='Cameroon'>Cameroon</option>
							<option value='Canada'>Canada</option>
							<option value='Cape Verde'>Cape Verde</option>
							<option value='Cayman Islands'>Cayman Islands</option>
							<option value='Central African Republic'>
								Central African Republic
							</option>
							<option value='Chad'>Chad</option>
							<option value='Chile'>Chile</option>
							<option value='China'>China</option>
							<option value='Christmas Island'>Christmas Island</option>
							<option value='Cocos (Keeling) Islands'>
								Cocos (Keeling) Islands
							</option>
							<option value='Colombia'>Colombia</option>
							<option value='Comoros'>Comoros</option>
							<option value='Congo'>Congo</option>
							<option value='Congo, The Democratic Republic of The'>
								Congo, The Democratic Republic of The
							</option>
							<option value='Cook Islands'>Cook Islands</option>
							<option value='Costa Rica'>Costa Rica</option>
							<option value="Cote D'ivoire">Cote D'ivoire</option>
							<option value='Croatia'>Croatia</option>
							<option value='Cuba'>Cuba</option>
							<option value='Cyprus'>Cyprus</option>
							<option value='Czech Republic'>Czech Republic</option>
							<option value='Denmark'>Denmark</option>
							<option value='Djibouti'>Djibouti</option>
							<option value='Dominica'>Dominica</option>
							<option value='Dominican Republic'>Dominican Republic</option>
							<option value='Ecuador'>Ecuador</option>
							<option value='Egypt'>Egypt</option>
							<option value='El Salvador'>El Salvador</option>
							<option value='Equatorial Guinea'>Equatorial Guinea</option>
							<option value='Eritrea'>Eritrea</option>
							<option value='Estonia'>Estonia</option>
							<option value='Ethiopia'>Ethiopia</option>
							<option value='Falkland Islands (Malvinas)'>
								Falkland Islands (Malvinas)
							</option>
							<option value='Faroe Islands'>Faroe Islands</option>
							<option value='Fiji'>Fiji</option>
							<option value='Finland'>Finland</option>
							<option value='France'>France</option>
							<option value='French Guiana'>French Guiana</option>
							<option value='French Polynesia'>French Polynesia</option>
							<option value='French Southern Territories'>
								French Southern Territories
							</option>
							<option value='Gabon'>Gabon</option>
							<option value='Gambia'>Gambia</option>
							<option value='Georgia'>Georgia</option>
							<option value='Germany'>Germany</option>
							<option value='Ghana'>Ghana</option>
							<option value='Gibraltar'>Gibraltar</option>
							<option value='Greece'>Greece</option>
							<option value='Greenland'>Greenland</option>
							<option value='Grenada'>Grenada</option>
							<option value='Guadeloupe'>Guadeloupe</option>
							<option value='Guam'>Guam</option>
							<option value='Guatemala'>Guatemala</option>
							<option value='Guernsey'>Guernsey</option>
							<option value='Guinea'>Guinea</option>
							<option value='Guinea-bissau'>Guinea-bissau</option>
							<option value='Guyana'>Guyana</option>
							<option value='Haiti'>Haiti</option>
							<option value='Heard Island and Mcdonald Islands'>
								Heard Island and Mcdonald Islands
							</option>
							<option value='Holy See (Vatican City State)'>
								Holy See (Vatican City State)
							</option>
							<option value='Honduras'>Honduras</option>
							<option value='Hong Kong'>Hong Kong</option>
							<option value='Hungary'>Hungary</option>
							<option value='Iceland'>Iceland</option>
							<option value='India'>India</option>
							<option value='Indonesia'>Indonesia</option>
							<option value='Iran, Islamic Republic of'>
								Iran, Islamic Republic of
							</option>
							<option value='Iraq'>Iraq</option>
							<option value='Isle of Man'>Isle of Man</option>
							<option value='Israel'>Israel</option>
							<option value='Italy'>Italy</option>
							<option value='Jamaica'>Jamaica</option>
							<option value='Japan'>Japan</option>
							<option value='Jersey'>Jersey</option>
							<option value='Jordan'>Jordan</option>
							<option value='Kazakhstan'>Kazakhstan</option>
							<option value='Kenya'>Kenya</option>
							<option value='Kiribati'>Kiribati</option>
							<option value="Korea, Democratic People's Republic of">
								Korea, Democratic People's Republic of
							</option>
							<option value='Korea, Republic of'>Korea, Republic of</option>
							<option value='Kuwait'>Kuwait</option>
							<option value='Kyrgyzstan'>Kyrgyzstan</option>
							<option value="Lao People's Democratic Republic">
								Lao People's Democratic Republic
							</option>
							<option value='Latvia'>Latvia</option>
							<option value='Lebanon'>Lebanon</option>
							<option value='Lesotho'>Lesotho</option>
							<option value='Liberia'>Liberia</option>
							<option value='Libyan Arab Jamahiriya'>
								Libyan Arab Jamahiriya
							</option>
							<option value='Liechtenstein'>Liechtenstein</option>
							<option value='Lithuania'>Lithuania</option>
							<option value='Luxembourg'>Luxembourg</option>
							<option value='Macao'>Macao</option>
							<option value='Macedonia, The Former Yugoslav Republic of'>
								Macedonia, The Former Yugoslav Republic of
							</option>
							<option value='Madagascar'>Madagascar</option>
							<option value='Malawi'>Malawi</option>
							<option value='Malaysia'>Malaysia</option>
							<option value='Maldives'>Maldives</option>
							<option value='Mali'>Mali</option>
							<option value='Malta'>Malta</option>
							<option value='Marshall Islands'>Marshall Islands</option>
							<option value='Martinique'>Martinique</option>
							<option value='Mauritania'>Mauritania</option>
							<option value='Mauritius'>Mauritius</option>
							<option value='Mayotte'>Mayotte</option>
							<option value='Mexico'>Mexico</option>
							<option value='Micronesia, Federated States of'>
								Micronesia, Federated States of
							</option>
							<option value='Moldova, Republic of'>Moldova, Republic of</option>
							<option value='Monaco'>Monaco</option>
							<option value='Mongolia'>Mongolia</option>
							<option value='Montenegro'>Montenegro</option>
							<option value='Montserrat'>Montserrat</option>
							<option value='Morocco'>Morocco</option>
							<option value='Mozambique'>Mozambique</option>
							<option value='Myanmar'>Myanmar</option>
							<option value='Namibia'>Namibia</option>
							<option value='Nauru'>Nauru</option>
							<option value='Nepal'>Nepal</option>
							<option value='Netherlands'>Netherlands</option>
							<option value='Netherlands Antilles'>Netherlands Antilles</option>
							<option value='New Caledonia'>New Caledonia</option>
							<option value='New Zealand'>New Zealand</option>
							<option value='Nicaragua'>Nicaragua</option>
							<option value='Niger'>Niger</option>
							<option value='Nigeria'>Nigeria</option>
							<option value='Niue'>Niue</option>
							<option value='Norfolk Island'>Norfolk Island</option>
							<option value='Northern Mariana Islands'>
								Northern Mariana Islands
							</option>
							<option value='Norway'>Norway</option>
							<option value='Oman'>Oman</option>
							<option value='Pakistan'>Pakistan</option>
							<option value='Palau'>Palau</option>
							<option value='Palestinian Territory, Occupied'>
								Palestinian Territory, Occupied
							</option>
							<option value='Panama'>Panama</option>
							<option value='Papua New Guinea'>Papua New Guinea</option>
							<option value='Paraguay'>Paraguay</option>
							<option value='Peru'>Peru</option>
							<option value='Philippines'>Philippines</option>
							<option value='Pitcairn'>Pitcairn</option>
							<option value='Poland'>Poland</option>
							<option value='Portugal'>Portugal</option>
							<option value='Puerto Rico'>Puerto Rico</option>
							<option value='Qatar'>Qatar</option>
							<option value='Reunion'>Reunion</option>
							<option value='Romania'>Romania</option>
							<option value='Russian Federation'>Russian Federation</option>
							<option value='Rwanda'>Rwanda</option>
							<option value='Saint Helena'>Saint Helena</option>
							<option value='Saint Kitts and Nevis'>
								Saint Kitts and Nevis
							</option>
							<option value='Saint Lucia'>Saint Lucia</option>
							<option value='Saint Pierre and Miquelon'>
								Saint Pierre and Miquelon
							</option>
							<option value='Saint Vincent and The Grenadines'>
								Saint Vincent and The Grenadines
							</option>
							<option value='Samoa'>Samoa</option>
							<option value='San Marino'>San Marino</option>
							<option value='Sao Tome and Principe'>
								Sao Tome and Principe
							</option>
							<option value='Saudi Arabia'>Saudi Arabia</option>
							<option value='Senegal'>Senegal</option>
							<option value='Serbia'>Serbia</option>
							<option value='Seychelles'>Seychelles</option>
							<option value='Sierra Leone'>Sierra Leone</option>
							<option value='Singapore'>Singapore</option>
							<option value='Slovakia'>Slovakia</option>
							<option value='Slovenia'>Slovenia</option>
							<option value='Solomon Islands'>Solomon Islands</option>
							<option value='Somalia'>Somalia</option>
							<option value='South Africa'>South Africa</option>
							<option value='South Georgia and The South Sandwich Islands'>
								South Georgia and The South Sandwich Islands
							</option>
							<option value='Spain'>Spain</option>
							<option value='Sri Lanka'>Sri Lanka</option>
							<option value='Sudan'>Sudan</option>
							<option value='Suriname'>Suriname</option>
							<option value='Svalbard and Jan Mayen'>
								Svalbard and Jan Mayen
							</option>
							<option value='Swaziland'>Swaziland</option>
							<option value='Sweden'>Sweden</option>
							<option value='Switzerland'>Switzerland</option>
							<option value='Syrian Arab Republic'>Syrian Arab Republic</option>
							<option value='Taiwan'>Taiwan</option>
							<option value='Tajikistan'>Tajikistan</option>
							<option value='Tanzania, United Republic of'>
								Tanzania, United Republic of
							</option>
							<option value='Thailand'>Thailand</option>
							<option value='Timor-leste'>Timor-leste</option>
							<option value='Togo'>Togo</option>
							<option value='Tokelau'>Tokelau</option>
							<option value='Tonga'>Tonga</option>
							<option value='Trinidad and Tobago'>Trinidad and Tobago</option>
							<option value='Tunisia'>Tunisia</option>
							<option value='Turkey'>Turkey</option>
							<option value='Turkmenistan'>Turkmenistan</option>
							<option value='Turks and Caicos Islands'>
								Turks and Caicos Islands
							</option>
							<option value='Tuvalu'>Tuvalu</option>
							<option value='Uganda'>Uganda</option>
							<option value='Ukraine'>Ukraine</option>
							<option value='United Arab Emirates'>United Arab Emirates</option>
							<option value='United States Minor Outlying Islands'>
								United States Minor Outlying Islands
							</option>
							<option value='Uruguay'>Uruguay</option>
							<option value='Uzbekistan'>Uzbekistan</option>
							<option value='Vanuatu'>Vanuatu</option>
							<option value='Venezuela'>Venezuela</option>
							<option value='Viet Nam'>Viet Nam</option>
							<option value='Virgin Islands, British'>
								Virgin Islands, British
							</option>
							<option value='Virgin Islands, U.S.'>Virgin Islands, U.S.</option>
							<option value='Wallis and Futuna'>Wallis and Futuna</option>
							<option value='Western Sahara'>Western Sahara</option>
							<option value='Yemen'>Yemen</option>
							<option value='Zambia'>Zambia</option>
							<option value='Zimbabwe'>Zimbabwe</option>
						</Form.Control>
					</Form.Group>
				</Col>
			</Row>

			<Row>
				<Col>
					<Button variant='primary' type='submit'>
						Create Rescue Account
					</Button>
				</Col>
				<Col className='d-flex justify-content-end'>
					<a href='/create-account' className='align-self-center'>
						Are you not a rescue?
					</a>
				</Col>
			</Row>
		</Form>
	);
};

export default CreateRescueAccountForm;
