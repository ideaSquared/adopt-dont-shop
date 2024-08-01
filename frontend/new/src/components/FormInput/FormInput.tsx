import React from 'react';
import styled from 'styled-components';

interface FormInputProps {
	label: string;
	description?: string;
	children: React.ReactNode;
}

const Container = styled.div`
	margin-bottom: 1rem;
`;

const Label = styled.label`
	display: block;
	margin-bottom: 0.5rem;
	font-weight: bold;
`;

const Description = styled.span`
	display: block;
	margin-bottom: 0.5rem;
	color: #6c757d;
	font-size: 0.875rem;
`;

const FormInput: React.FC<FormInputProps> = ({
	label,
	description,
	children,
}) => {
	return (
		<Container>
			<Label>{label}</Label>
			{description && <Description>{description}</Description>}
			{children}
		</Container>
	);
};

export default FormInput;
