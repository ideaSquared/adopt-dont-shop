// Export schemas and types
export * from './schemas';

// Export service
export { SupportTicketService, supportTicketService } from './support-ticket-service';

// Export hooks
export {
  useTickets,
  useTicketDetail,
  useTicketStats,
  useMyTickets,
  useTicketMutations,
} from './hooks';

// Export utilities
export {
  getCategoryLabel,
  getStatusLabel,
  getPriorityLabel,
  getPriorityColor,
  getStatusColor,
  formatDate,
  formatRelativeTime,
  calculateResolutionTime,
  isTicketOverdue,
  getTicketAge,
  formatDuration,
  buildQueryString,
  getCategoryIcon,
  needsAttention,
  formatTicketId,
} from './utils';
