import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@adopt-dont-shop/lib.api';
import type { Conversation, Message } from '../types';

type UseQueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

type UseMutationState<T> = {
  mutate: (variables: T) => Promise<void>;
  mutateAsync: (variables: T) => Promise<unknown>;
  isLoading: boolean;
  error: Error | null;
};

interface ChatFilters {
  search?: string;
  status?: string;
  rescueId?: string;
  page?: number;
  limit?: number;
}

interface ChatListResponse {
  success: boolean;
  data: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface ChatStats {
  totalChats: number;
  totalMessages: number;
  activeChats: number;
  averageMessagesPerChat: number;
}

/**
 * Hook to fetch all chats with filtering (admin view)
 */
export const useAdminChats = (filters: ChatFilters = {}): UseQueryState<ChatListResponse> => {
  const [data, setData] = useState<ChatListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.get<ChatListResponse>('/api/v1/chats', filters);
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return { data, isLoading, error, refetch: fetchChats };
};

/**
 * Hook to fetch a specific chat by ID
 */
export const useAdminChatById = (chatId: string | null): UseQueryState<Conversation> => {
  const [data, setData] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChat = useCallback(async () => {
    if (!chatId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.get<{ success: boolean; data: Conversation }>(
        `/api/v1/chats/${chatId}`
      );
      setData(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  return { data, isLoading, error, refetch: fetchChat };
};

/**
 * Hook to fetch messages for a specific chat
 */
export const useAdminChatMessages = (
  chatId: string | null,
  page = 1,
  limit = 50
): UseQueryState<MessagesResponse> => {
  const [data, setData] = useState<MessagesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!chatId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.get<MessagesResponse>(`/api/v1/chats/${chatId}/messages`, {
        page,
        limit,
      });
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, page, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { data, isLoading, error, refetch: fetchMessages };
};

/**
 * Hook to fetch chat statistics
 */
export const useAdminChatStats = (): UseQueryState<ChatStats> => {
  const [data, setData] = useState<ChatStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.get<{ success: boolean; data: ChatStats }>(
        '/api/v1/chats/analytics'
      );
      setData(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, isLoading, error, refetch: fetchStats };
};

/**
 * Hook to search conversations with text search
 */
export const useAdminSearchChats = (
  query: string,
  enabled = true
): UseQueryState<ChatListResponse> => {
  const [data, setData] = useState<ChatListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const searchChats = useCallback(async () => {
    if (!enabled || !query || query.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.get<ChatListResponse>('/api/v1/chats/search', { query });
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [query, enabled]);

  useEffect(() => {
    searchChats();
  }, [searchChats]);

  return { data, isLoading, error, refetch: searchChats };
};

/**
 * Hook for chat mutations (delete, update status, etc.)
 */
export const useAdminChatMutations = () => {
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  const [isLoadingDeleteMessage, setIsLoadingDeleteMessage] = useState(false);
  const [errorDelete, setErrorDelete] = useState<Error | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<Error | null>(null);
  const [errorDeleteMessage, setErrorDeleteMessage] = useState<Error | null>(null);

  const deleteChat: UseMutationState<string> = {
    mutate: async (chatId: string) => {
      try {
        setIsLoadingDelete(true);
        setErrorDelete(null);
        await apiService.delete(`/api/v1/chats/${chatId}`);
      } catch (err) {
        setErrorDelete(err as Error);
        throw err;
      } finally {
        setIsLoadingDelete(false);
      }
    },
    mutateAsync: async (chatId: string) => {
      try {
        setIsLoadingDelete(true);
        setErrorDelete(null);
        const result = await apiService.delete(`/api/v1/chats/${chatId}`);
        return result;
      } catch (err) {
        setErrorDelete(err as Error);
        throw err;
      } finally {
        setIsLoadingDelete(false);
      }
    },
    isLoading: isLoadingDelete,
    error: errorDelete,
  };

  const updateChatStatus: UseMutationState<{ chatId: string; status: string }> = {
    mutate: async ({ chatId, status }) => {
      try {
        setIsLoadingUpdate(true);
        setErrorUpdate(null);
        await apiService.patch(`/api/v1/chats/${chatId}`, { status });
      } catch (err) {
        setErrorUpdate(err as Error);
        throw err;
      } finally {
        setIsLoadingUpdate(false);
      }
    },
    mutateAsync: async ({ chatId, status }) => {
      try {
        setIsLoadingUpdate(true);
        setErrorUpdate(null);
        const result = await apiService.patch(`/api/v1/chats/${chatId}`, { status });
        return result;
      } catch (err) {
        setErrorUpdate(err as Error);
        throw err;
      } finally {
        setIsLoadingUpdate(false);
      }
    },
    isLoading: isLoadingUpdate,
    error: errorUpdate,
  };

  const deleteMessage: UseMutationState<{ chatId: string; messageId: string }> = {
    mutate: async ({ chatId, messageId }) => {
      try {
        setIsLoadingDeleteMessage(true);
        setErrorDeleteMessage(null);
        await apiService.delete(`/api/v1/chats/${chatId}/messages/${messageId}`);
      } catch (err) {
        setErrorDeleteMessage(err as Error);
        throw err;
      } finally {
        setIsLoadingDeleteMessage(false);
      }
    },
    mutateAsync: async ({ chatId, messageId }) => {
      try {
        setIsLoadingDeleteMessage(true);
        setErrorDeleteMessage(null);
        const result = await apiService.delete(`/api/v1/chats/${chatId}/messages/${messageId}`);
        return result;
      } catch (err) {
        setErrorDeleteMessage(err as Error);
        throw err;
      } finally {
        setIsLoadingDeleteMessage(false);
      }
    },
    isLoading: isLoadingDeleteMessage,
    error: errorDeleteMessage,
  };

  return {
    deleteChat,
    updateChatStatus,
    deleteMessage,
  };
};
