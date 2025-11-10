import { useState, useEffect, useCallback } from 'react';
import { supportTicketService } from './support-ticket-service';
import type {
  SupportTicket,
  TicketFilters,
  TicketsResponse,
  TicketStats,
  CreateTicketRequest,
  UpdateTicketRequest,
  AssignTicketRequest,
  AddResponseRequest,
  EscalateTicketRequest,
  RateTicketRequest,
} from './schemas';

type UseQueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

/**
 * Hook for fetching support tickets with filters
 */
export const useTickets = (filters?: TicketFilters): UseQueryState<TicketsResponse> => {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filters to string for stable dependency comparison
  const filtersKey = JSON.stringify(filters || {});

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await supportTicketService.getTickets(filters);
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]); // Use serialized key instead of object reference

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTickets,
  };
};

/**
 * Hook for fetching a single ticket by ID
 */
export const useTicketDetail = (ticketId: string): UseQueryState<SupportTicket> => {
  const [data, setData] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.getTicketById(ticketId);
      setData(ticket);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTicket,
  };
};

/**
 * Hook for fetching support ticket statistics
 */
export const useTicketStats = (): UseQueryState<TicketStats> => {
  const [data, setData] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await supportTicketService.getTicketStats();
      setData(stats);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats,
  };
};

/**
 * Hook for fetching tickets assigned to current user
 */
export const useMyTickets = (status?: string): UseQueryState<SupportTicket[]> => {
  const [data, setData] = useState<SupportTicket[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMyTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tickets = await supportTicketService.getMyTickets(status);
      setData(tickets);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMyTickets,
  };
};

/**
 * Hook for managing ticket mutations (create, update, assign, respond, etc.)
 */
export const useTicketMutations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTicket = async (data: CreateTicketRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.createTicket(data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicket = async (ticketId: string, data: UpdateTicketRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.updateTicket(ticketId, data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const assignTicket = async (ticketId: string, data: AssignTicketRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.assignTicket(ticketId, data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addResponse = async (ticketId: string, data: AddResponseRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.addResponse(ticketId, data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const escalateTicket = async (ticketId: string, data: EscalateTicketRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.escalateTicket(ticketId, data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const closeTicket = async (ticketId: string, notes?: string): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.closeTicket(ticketId, notes);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resolveTicket = async (ticketId: string, notes?: string): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.resolveTicket(ticketId, notes);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reopenTicket = async (ticketId: string, notes?: string): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.reopenTicket(ticketId, notes);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const setPriority = async (ticketId: string, priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical'): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.setPriority(ticketId, priority);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const rateTicket = async (ticketId: string, data: RateTicketRequest): Promise<SupportTicket> => {
    try {
      setIsLoading(true);
      setError(null);
      const ticket = await supportTicketService.rateTicket(ticketId, data);
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createTicket,
    updateTicket,
    assignTicket,
    addResponse,
    escalateTicket,
    closeTicket,
    resolveTicket,
    reopenTicket,
    setPriority,
    rateTicket,
  };
};
