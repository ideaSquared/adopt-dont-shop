import React from 'react';

const RescueNoPermissions = ({ rescueProfile }) => {
	return (
		<div>
			<p>
				<strong>{rescueProfile.rescueName}</strong> has not given you permission
				to view this page - please contact an administrator to resolve this if
				you believe this to be incorrect.
			</p>
		</div>
	);
};

export default RescueNoPermissions;
