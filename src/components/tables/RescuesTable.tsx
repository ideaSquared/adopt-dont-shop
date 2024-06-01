import React from 'react';
import PaginationControls from '../common/PaginationControls';
import { Rescue } from '../../types/rescue';

interface RescuesTableProps {
    currentRescues: Rescue[];
    onDeleteRescue: (rescueId: string) => void;
    onShowDetails: (rescueId: string) => void;
    currentPage: number;
    totalPages: number;
    onChangePage: (page: number) => void;
}

const RescuesTable: React.FC<RescuesTableProps> = ({
    currentRescues,
    onDeleteRescue,
    onShowDetails,
    currentPage,
    totalPages,
    onChangePage,
}) => {
    return (
        <>
            <div className='overflow-x-auto'>
                <table className='table-auto w-full'>
                    <thead>
                        <tr>
                            <th className='border px-4 py-2'>Rescue ID</th>
                            <th className='border px-4 py-2'>Rescue Name</th>
                            <th className='border px-4 py-2'>Type</th>
                            <th className='border px-4 py-2'>Staff</th>
                            <th className='border px-4 py-2'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRescues.map((rescue) => (
                            <tr
                                key={rescue.rescueId}
                                className='hover:bg-gray-100'
                                style={{ cursor: 'pointer' }}
                            >
                                <td className='border px-4 py-2'>{rescue.rescueId}</td>
                                <td
                                    className='border px-4 py-2'
                                    onClick={() => onShowDetails(rescue.rescueId)}
                                >
                                    {rescue.rescueName ?? ''}
                                </td>
                                <td
                                    className='border px-4 py-2'
                                    onClick={() => onShowDetails(rescue.rescueId)}
                                >
                                    {rescue.rescueType ?? 'Type Unavailable'}
                                </td>
                                <td
                                    className='border px-4 py-2'
                                    onClick={() => onShowDetails(rescue.rescueId)}
                                >
                                    {rescue.staff.map((staffMember, index) => (
                                        <div key={index}>
                                            {staffMember.email ?? 'Email not available'}
                                        </div>
                                    ))}
                                </td>
                                <td className='border px-4 py-2'>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteRescue(rescue.rescueId);
                                        }}
                                        className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onChangePage={onChangePage}
            />
        </>
    );
};

export default RescuesTable;
