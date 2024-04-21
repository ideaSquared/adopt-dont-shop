import React from 'react';
import { Row, Col } from 'react-bootstrap'; // assuming you have react-bootstrap installed

const Footer = () => {
	return (
		<Row
			as='footer'
			className='footer bg-dark text-white text-center py-3 w-100'
		>
			<Col>
				<p>© 2024 Adopt Don't Shop. All rights reserved.</p>
			</Col>
		</Row>
	);
};

export default Footer;
``;
