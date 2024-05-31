import { useState, useEffect } from 'react';
import axios from 'axios';

type Pet = {
  pet_id: string;
  name: string;
  type: string;
  age: number;
  breed: string;
  gender: string;
  images: string[];
  short_description: string;
  long_description: string;
  status: string;
  distance: number;
};

interface ErrorResponse {
  status: number;
  message: string;
}

export const useFetchUnratedPets = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [noUnratedPets, setNoUnratedPets] = useState(false);

  useEffect(() => {
    const fetchUnratedPets = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<Pet[]>(
          `${import.meta.env.VITE_API_BASE_URL}/ratings/find-unrated`,
          {
            withCredentials: true,
          }
        );
        setPets(response.data);
        if (response.data.length === 0) {
          setNoUnratedPets(true);
        }
      } catch (err: any) {
        setError({
          status: err.response?.status || 500,
          message: err.message || 'An unexpected error occurred'
        });
        if (err.response && err.response.status === 404) {
          setNoUnratedPets(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnratedPets();
  }, []);

  return { pets, isLoading, error, noUnratedPets };
};