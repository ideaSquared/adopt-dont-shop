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

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface StaffActivity {
  id: string;
  staffId: string;
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
