import { useQuery } from '@tanstack/react-query';
import { applicationService, petService, type Application, type Pet } from '@/services';

export type ApplicationWithPet = Application & {
  pet?: Pet;
};

const loadApplicationsWithPets = async (): Promise<ApplicationWithPet[]> => {
  const userApplications = await applicationService.getUserApplications();

  // Load pet details for each application; a missing pet must not hide the application.
  return Promise.all(
    userApplications.map(async (app): Promise<ApplicationWithPet> => {
      try {
        const pet = await petService.getPetById(app.petId);
        return { ...app, pet };
      } catch (error) {
        console.error(`Failed to load pet for application ${app.id}:`, error);
        return app;
      }
    })
  );
};

export const useUserApplications = (userId: string | undefined) =>
  useQuery({
    queryKey: ['applications', 'mine', userId],
    queryFn: loadApplicationsWithPets,
    enabled: !!userId,
  });
