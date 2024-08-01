import { useState, useEffect } from 'react';
import { Pet } from '../types/pet';
import PetService from '../services/PetService'; 

interface ErrorResponse {
  status: number;
  message: string;
}

export const useFetchPetsByRescueId = (rescueId: string | null) => {
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);

  useEffect(() => {
    const fetchPets = async () => {
      if (!rescueId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const pets = await PetService.fetchPets(rescueId);
        setAllPets(pets);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          console.log('No pets found for this owner');
          setAllPets([]);
        } else {
          console.error(err);
          setError({
            status: err.response?.status || 500,
            message: err.message || 'An unexpected error occurred',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPets();
  }, [rescueId]);

  return { allPets, isLoading, error };
};
