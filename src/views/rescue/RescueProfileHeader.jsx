import React from 'react';
import { Badge } from 'react-bootstrap';

const RescueProfileHeader = ({ rescueProfile }) => {
	return (
		<div>
			<h1>
				<span style={{ verticalAlign: 'top' }}>
					<Badge
						bg={rescueProfile.referenceNumberVerified ? 'success' : 'danger'}
						style={{ fontSize: '16px' }}
					>
						{rescueProfile.referenceNumberVerified ? 'Verified' : 'Un-verified'}
					</Badge>
				</span>{' '}
				<span style={{ verticalAlign: 'top' }} bg='light'>
					<Badge style={{ fontSize: '16px' }}>{rescueProfile.id}</Badge>
				</span>
			</h1>
		</div>
	);
};

export default RescueProfileHeader;
