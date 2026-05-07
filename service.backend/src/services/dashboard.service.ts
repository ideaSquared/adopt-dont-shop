import Application from '../models/Application';
import Pet from '../models/Pet';

export type ActivityType = 'pet_added' | 'application_received';

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export class DashboardService {
  static async getActivityForRescue(rescueId: string, limit: number): Promise<ActivityItem[]> {
    const [recentPets, recentApplications] = await Promise.all([
      Pet.findAll({
        where: { rescueId },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['petId', 'name', 'createdAt'],
      }),
      Application.findAll({
        where: { rescueId },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['applicationId', 'petId', 'createdAt'],
      }),
    ]);

    const petActivities: ActivityItem[] = recentPets.map(pet => ({
      id: `pet_added_${pet.petId}`,
      type: 'pet_added',
      title: 'New Pet Added',
      description: `${pet.name} was added to your rescue`,
      timestamp: pet.createdAt.toISOString(),
      metadata: { petId: pet.petId, petName: pet.name },
    }));

    const applicationActivities: ActivityItem[] = recentApplications.map(app => ({
      id: `application_received_${app.applicationId}`,
      type: 'application_received',
      title: 'New Application',
      description: 'A new adoption application was received',
      timestamp: app.createdAt.toISOString(),
      metadata: { applicationId: app.applicationId, petId: app.petId },
    }));

    return [...petActivities, ...applicationActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
