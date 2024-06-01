import React from 'react';
import { RatingsTableProps } from '../../types/ratingsTable';

const RatingsTable: React.FC<RatingsTableProps> = ({
    filteredRatings,
    onCreateConversation,
}) => {
    return (
        <div className='overflow-x-auto'>
            <table className='table-auto w-full'>
                <thead>
                    <tr>
                        <th className='border px-4 py-2'>Pet Name</th>
                        <th className='border px-4 py-2'>User First Name</th>
                        <th className='border px-4 py-2'>Rating Type</th>
                        <th className='border px-4 py-2'>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRatings.map((rating) => (
                        <tr key={rating.id} className='hover:bg-gray-100'>
                            <td className='border px-4 py-2'>{rating.name}</td>
                            <td className='border px-4 py-2'>
                                {rating.adopter_first_name} {rating.adopter_last_name}
                            </td>
                            <td
                                className='border px-4 py-2'
                                style={{
                                    backgroundColor:
                                        rating.rating_type === 'love' ? '#FF1493' : '#58D68D',
                                }}
                            >
                                {rating.rating_type}
                            </td>
                            <td className='border px-4 py-2'>
                                <button
                                    onClick={() =>
                                        onCreateConversation(rating.pet_id, rating.userid)
                                    }
                                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                                >
                                    Start Conversation
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RatingsTable;
