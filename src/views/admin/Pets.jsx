import React from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';

const AdminPets = () => {
	useAdminRedirect();

	return <h1>Pets</h1>;
};

export default AdminPets;
