import React from 'react';

const RescueNoPermissions = ({ rescueProfile }) => {
	return (
		<div>
			<h1>{rescueProfile.rescueName}</h1>
			<p>
				Has not given you permission to view this page - please contact an
				administrator to resolve this if you believe this to be incorrect.
			</p>
		</div>
	);
};

export default RescueNoPermissions;
