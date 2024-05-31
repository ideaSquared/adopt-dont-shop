import React, { useState } from 'react';
import { useFetchUnratedPets } from '../../hooks/useFetchUnratedPets';
import { useAuth } from '../../contexts/AuthContext';
import { postRating } from '../../services/RatingService';
import SwipeLanding from './SwipeLanding';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';

interface Pet {
  pet_id: string;
  name: string;
  distance: number;
  age: number;
  gender: string;
  status: string;
  short_description: string;
  long_description: string;
  images: string[];
}

interface FetchUnratedPetsResponse {
  pets: Pet[];
  isLoading: boolean;
  error: { status: number; message: string } | null;
  noUnratedPets: boolean;
}

const SwipeContainer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const { pets, isLoading, error, noUnratedPets }: FetchUnratedPetsResponse = useFetchUnratedPets();
  const { userId } = useAuth().authState;
  useLoginRedirect();

  const handleSwipe = async (direction: 'left' | 'love' | 'right') => {
    if (currentIndex < pets.length) {
      const ratingType = direction === 'love' ? 'love' : direction === 'left' ? 'dislike' : 'like';
      await postRating(pets[currentIndex].pet_id, ratingType, userId);

      setCurrentIndex((prevIndex: number) => prevIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='bg-white p-6 rounded-lg shadow-md'>Loading...</div>
      </div>
    );
  }

  if (noUnratedPets || (error && error.status === 404)) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='bg-white p-6 rounded-lg shadow-md'>
          No more items to swipe!
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='bg-white p-6 rounded-lg shadow-md'>
          Error: {error.message}
        </div>
      </div>
    );
  }

  const currentPet = pets[currentIndex];
  return <SwipeLanding item={currentPet} handleSwipe={handleSwipe} />;
};

export default SwipeContainer;