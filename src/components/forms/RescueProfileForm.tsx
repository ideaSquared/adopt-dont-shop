import React, { ChangeEvent, FormEvent } from 'react';
import CountrySelect from '../inputs/CountrySelect';

interface RescueProfile {
  rescueName: string;
  rescueType: string;
  referenceNumber?: string;
  referenceNumberVerified?: boolean;
  country?: string;
}

interface RescueProfileFormProps {
  rescueProfile: RescueProfile;
  handleRescueInfoChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement> | string) => void;
  handleReferenceNumberSubmit: () => void;
  canEditRescueInfo: boolean;
  saveUpdates: () => void;
}

const RescueProfileForm: React.FC<RescueProfileFormProps> = ({
  rescueProfile,
  handleRescueInfoChange,
  handleReferenceNumberSubmit,
  canEditRescueInfo,
  saveUpdates,
}) => {
  const onSubmitUpdates = (e: FormEvent) => {
    e.preventDefault();
    saveUpdates();
  };

  const onSubmitReferenceNumber = (e: FormEvent) => {
    e.preventDefault();
    handleReferenceNumberSubmit();
  };

  return (
    <form onSubmit={onSubmitUpdates}>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-3'>
        <div className='space-y-2'>
          <label
            htmlFor='rescueName'
            className='block text-sm font-medium text-gray-700'
          >
            Rescue name
          </label>
          <input
            type='text'
            id='rescueName'
            name='rescueName'
            value={rescueProfile.rescueName}
            onChange={handleRescueInfoChange}
            disabled={!canEditRescueInfo}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
            aria-required='true'
          />
        </div>
        <div className='space-y-2'>
          <label
            htmlFor='rescueType'
            className='block text-sm font-medium text-gray-700'
          >
            Rescue type
          </label>
          <select
            id='rescueType'
            name='rescueType'
            value={rescueProfile.rescueType}
            onChange={handleRescueInfoChange}
            disabled={!canEditRescueInfo}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
            aria-required='true'
          >
            <option value='individual'>Individual</option>
            <option value='charity'>Charity</option>
            <option value='company'>Company</option>
          </select>
        </div>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-3'>
        <div className='space-y-2'>
          <label
            htmlFor='referenceNumber'
            className='block text-sm font-medium text-gray-700'
          >
            Reference number
          </label>
          <div className='flex items-center'>
            <input
              type='text'
              id='referenceNumber'
              name='referenceNumber'
              value={rescueProfile.referenceNumber || ''}
              onChange={handleRescueInfoChange}
              disabled={!canEditRescueInfo}
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
              aria-required='true'
            />
            <button
              type='button'
              onClick={onSubmitReferenceNumber}
              disabled={
                !canEditRescueInfo || rescueProfile.referenceNumberVerified
              }
              className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-2'
            >
              Submit for verification
            </button>
          </div>
        </div>
        <div className='space-y-2'>
          <label
            htmlFor='country'
            className='block text-sm font-medium text-gray-700'
          >
            Country
          </label>
          <CountrySelect
            onCountryChange={(value) => handleRescueInfoChange(value)}
            countryValue={rescueProfile.country || 'United Kingdom'}
            disabled={!canEditRescueInfo}
          />
        </div>
      </div>
      <button
        type='submit'
        disabled={!canEditRescueInfo}
        className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full'
      >
        Save changes
      </button>
    </form>
  );
};

export default RescueProfileForm;
