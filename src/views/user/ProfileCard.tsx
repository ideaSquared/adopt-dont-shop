import React, { useState } from 'react';
import { PencilSquare } from 'react-bootstrap-icons';
import AccountProfileForm from '../../components/forms/AccountProfileForm';

interface UserData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  description: string;
}

interface ProfileCardProps {
  userData: Partial<UserData>;
  updateUserDetails: (formData: UserData) => Promise<{ success: boolean; error?: string }>;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ userData, updateUserDetails }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className='bg-light p-6 rounded-lg shadow-md'>
      <div className='flex justify-between items-center relative'>
        <img
          src='https://via.placeholder.com/150'
          alt='Profile Photo'
          className='rounded-full mb-3 w-24 h-24'
        />
        <button
          className='bg-blue-500 text-white px-4 py-2 rounded absolute top-2 right-2 flex items-center'
          onClick={handleEditClick}
        >
          <PencilSquare className='mr-2' /> Edit my details
        </button>
      </div>
      {isEditing ? (
        <AccountProfileForm
          initialData={userData}
          updateUserDetails={updateUserDetails}
        />
      ) : (
        <>
          <h2 className='text-xl font-bold'>
            {userData.firstName || ''} {userData.lastName || ''}
          </h2>
          <p className='mt-2'>
            {userData.description ||
              "This person hasn't filled out a description but we're sure they're awesome!"}
          </p>
          <p className='text-sm text-gray-500 mt-2'>
            Location: {userData.city || ''}, {userData.country || ''}
          </p>
        </>
      )}
    </div>
  );
};

export default ProfileCard;
