import { Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { applicationService, petService, Application, Pet } from '@/services';
import * as styles from './ApplicationDashboard.css';

interface ApplicationWithPet extends Application {
  pet?: Pet;
}

export const ApplicationDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const userApplications = await applicationService.getUserApplications();

      // Load pet details for each application
      const applicationsWithPets = await Promise.all(
        userApplications.map(async app => {
          try {
            const pet = await petService.getPetById(app.petId);
            return { ...app, pet };
          } catch (error) {
            console.error(`Failed to load pet for application ${app.id}:`, error);
            return app;
          }
        })
      );

      setApplications(applicationsWithPets);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationClick = (application: ApplicationWithPet) => {
    // Navigate to application details view
    navigate(`/applications/${application.id}`);
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Please log in to view your applications</h2>
          <Link to='/login'>
            <Button>Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div>Loading your applications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Error loading applications</h2>
          <p>{error}</p>
          <Button onClick={loadApplications}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Applications</h1>
        </div>
        <div className={styles.emptyState}>
          <h2>No applications yet</h2>
          <p>Start your adoption journey by browsing available pets.</p>
          <Link to='/pets'>
            <Button>Browse Pets</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Applications</h1>
      </div>

      <div className={styles.applicationGrid}>
        {applications.map(application => (
          <Card
            key={application.id}
            className={styles.applicationCard}
            onClick={() => handleApplicationClick(application)}
          >
            <div className={styles.petInfo}>
              <div>
                <h3 className={styles.petDetailsH3}>
                  {application.pet?.name || 'Pet Name Unavailable'}
                </h3>
                <p className={styles.petDetailsP}>
                  {application.pet?.breed} • {application.pet?.age_years} years old
                </p>
              </div>
            </div>

            <span
              className={styles.statusBadge({
                status: (['submitted', 'under_review', 'approved', 'rejected'].includes(
                  application.status
                )
                  ? application.status
                  : 'default') as
                  | 'submitted'
                  | 'under_review'
                  | 'approved'
                  | 'rejected'
                  | 'default',
              })}
            >
              {application.status.replace('_', ' ')}
            </span>

            <div className={styles.applicationDetails}>
              {application.submittedAt && (
                <p>
                  <strong>Submitted:</strong>{' '}
                  {new Date(application.submittedAt).toLocaleDateString()}
                </p>
              )}
              <p>
                <strong>Last Updated:</strong>{' '}
                {new Date(application.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className={styles.actionButtons}>
              <Button
                size='sm'
                variant='outline'
                onClick={e => {
                  e.stopPropagation();
                  handleApplicationClick(application);
                }}
              >
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
