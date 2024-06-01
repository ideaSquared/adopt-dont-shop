import React, { useState } from 'react';
import { Rescue as RescueDetailsType } from '../../types/rescue';

interface RescueDetailsProps {
  details: RescueDetailsType;
  onUpdateDetails: (updatedDetails: RescueDetailsType) => void;
}

const RescueDetails: React.FC<RescueDetailsProps> = ({ details, onUpdateDetails }) => {
  const [name, setName] = useState(details.name);
  const [address, setAddress] = useState(details.address);
  const [phone, setPhone] = useState(details.phone);
  const [email, setEmail] = useState(details.email);
  const [description, setDescription] = useState(details.description);

  const handleSave = () => {
    onUpdateDetails({ name, address, phone, email, description });
  };

  return (
    <div className='space-y-4'>
      <div>
        <label className='block text-sm font-medium text-gray-700'>Name</label>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700'>Address</label>
        <input
          type='text'
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700'>Phone</label>
        <input
          type='text'
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700'>Email</label>
        <input
          type='text'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700'>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
        />
      </div>
      <button
        onClick={handleSave}
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
      >
        Save
      </button>
    </div>
  );
};

export default RescueDetails;
