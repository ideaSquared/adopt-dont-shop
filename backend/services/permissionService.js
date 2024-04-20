// utils/permissions.js

import { pool } from '../dbConnection.js';

export const permissionService = {
	async checkPermission(userId, permissionRequired) {
		if (!userId) {
			throw new Error('No userId provided');
		}

		try {
			const client = await pool.connect();

			const queryText = `
            SELECT permissions 
            FROM staff_members 
            WHERE user_id = $1;
        `;
			const { rows } = await client.query(queryText, [userId]);
			client.release(); // Release the client back to the pool

			const hasPermission = rows.some((row) =>
				row.permissions.includes(permissionRequired)
			);

			return hasPermission;
		} catch (error) {
			console.error('Error checking permission:', error);
			throw error;
		}
	},
};
