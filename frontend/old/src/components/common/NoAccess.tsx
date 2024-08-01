import React, { ReactNode } from 'react';

type NoAccessProps = {};

const NoAccess: React.FC<NoAccessProps> = ({}) => {
	return (
		<div>
			<h4>Looks like you haven't got acesss to this</h4>
			<p>If you think this is an error please contact your rescue</p>
		</div>
	);
};

export default NoAccess;
