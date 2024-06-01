import React from 'react';
import { StaffMember } from '../../types/rescue';

interface PermissionCategories {
    [category: string]: string[];
}

interface PermissionNames {
    [permission: string]: string;
}

interface StaffTableProps {
    staff: StaffMember[];
    verifyStaff: (user_id: string) => void;
    removeStaff: (user_id: string) => void;
    updatePermissions: (user_id: string, permission: string, value: boolean) => void;
    canEdit: boolean;
    permissionCategories: PermissionCategories;
    permissionNames: PermissionNames;
    user_id: string;
}

const StaffTable: React.FC<StaffTableProps> = ({
    staff,
    verifyStaff,
    removeStaff,
    updatePermissions,
    canEdit,
    permissionCategories,
    permissionNames,
    user_id,
}) => {
    return (
        <div>
            <table className="table-auto w-full border-collapse">
                <thead>
                    <tr>
                        <th rowSpan={2} className="border px-4 py-2">Staff Email</th>
                        {Object.entries(permissionCategories).map(([category, permissions]) => (
                            <th colSpan={permissions.length} key={category} className="border px-4 py-2">
                                {category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
                            </th>
                        ))}
                        <th rowSpan={2} className="border px-4 py-2">Actions</th>
                    </tr>
                    <tr>
                        {Object.values(permissionCategories).flat().map(permission => (
                            <th key={permission} className="border px-4 py-2">
                                {permissionNames[permission]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {staff.map(staffMember => (
                        <tr key={staffMember.user_id} className="hover:bg-gray-100">
                            <td className="border px-4 py-2">{staffMember.email}</td>
                            {Object.values(permissionCategories).flat().map(permission => (
                                <td key={`${staffMember.user_id}-${permission}`} className="border px-4 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={staffMember.permissions ? staffMember.permissions.includes(permission) : false}
                                        onChange={e => updatePermissions(staffMember.user_id, permission, e.target.checked)}
                                        disabled={staffMember.user_id === user_id || !canEdit}
                                        className="form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                </td>
                            ))}
                            <td className="border px-4 py-2">
                                {staffMember.verifiedByRescue ? (
                                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled>
                                        Verified
                                    </button>
                                ) : (
                                    <button className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded" onClick={() => verifyStaff(staffMember.user_id)} disabled={!canEdit}>
                                        Verify
                                    </button>
                                )}{' '}
                                <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => removeStaff(staffMember.user_id)} disabled={!canEdit}>
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StaffTable;
