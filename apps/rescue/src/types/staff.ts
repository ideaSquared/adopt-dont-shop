export interface StaffMember {
  id: string;
  userId: string;
  rescueId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  isVerified: boolean;
  addedAt: string;
}

export interface NewStaffMember {
  userId: string;
  title?: string;
}
