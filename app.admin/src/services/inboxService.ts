import { apiService } from './libraryServices';

export type InboxSource = 'moderation' | 'support' | 'message';

export type InboxItem = {
  id: string;
  source: InboxSource;
  title: string;
  summary: string;
  status: string;
  severity: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  relatedUserId: string | null;
  relatedUserEmail: string | null;
};

export type InboxFilters = {
  source?: InboxSource;
  status?: string;
  assignedTo?: string;
  severity?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

type InboxResponse = {
  data: ReadonlyArray<InboxItem>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const inboxService = {
  async getItems(filters: InboxFilters = {}): Promise<InboxResponse> {
    return apiService.get<InboxResponse>('/api/v1/admin/inbox', filters);
  },

  async assign(itemId: string, source: InboxSource, assignedTo: string): Promise<void> {
    await apiService.post<void>('/api/v1/admin/inbox/assign', {
      itemId,
      source,
      assignedTo,
    });
  },
};
