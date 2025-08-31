import { useState, useEffect } from 'react';
import { staffService, StaffMember } from '../services/staffService';
import { NewStaffMember } from '../types/staff';
import { useAuth } from '../contexts/AuthContext';

export const useStaff = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.userId) {
        setStaff([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch staff for the current user's rescue (automatically filtered by backend)
        const staffMembers = await staffService.getRescueStaff();
        setStaff(staffMembers);
      } catch (err) {
        setError('Failed to load staff members');
        setStaff([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [user?.userId]);

  return {
    staff,
    loading,
    error,
    refetch: async () => {
      if (user?.userId) {
        setLoading(true);
        try {
          const staffMembers = await staffService.getRescueStaff();
          setStaff(staffMembers);
          setError(null);
        } catch (err) {
          setError('Failed to reload staff members');
        } finally {
          setLoading(false);
        }
      }
    },
    addStaffMember: async (staffData: NewStaffMember, rescueId: string) => {
      try {
        const newStaff = await staffService.addStaffMember(staffData, rescueId);
        setStaff(prev => [...prev, newStaff]);
        return newStaff;
      } catch (error) {
        throw error;
      }
    },
    removeStaffMember: async (userId: string, rescueId: string) => {
      try {
        await staffService.removeStaffMember(userId, rescueId);
        setStaff(prev => prev.filter(member => member.userId !== userId));
      } catch (error) {
        throw error;
      }
    },
    updateStaffMember: async (userId: string, staffData: { title?: string }, rescueId: string) => {
      try {
        const updatedStaff = await staffService.updateStaffMember(userId, staffData, rescueId);
        setStaff(prev => prev.map(member => 
          member.userId === userId ? updatedStaff : member
        ));
        return updatedStaff;
      } catch (error) {
        throw error;
      }
    },
  };
};

export default useStaff;
