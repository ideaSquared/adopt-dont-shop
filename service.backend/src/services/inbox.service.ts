import { Op } from 'sequelize';
import { z } from 'zod';
import Report, { ReportSeverity, ReportStatus } from '../models/Report';
import SupportTicket, { TicketPriority, TicketStatus } from '../models/SupportTicket';
import { Chat } from '../models/Chat';
import { ChatParticipant } from '../models/ChatParticipant';
import User from '../models/User';
import { ChatStatus } from '../types/chat';

export const InboxSourceSchema = z.enum(['moderation', 'support', 'message']);
export type InboxSource = z.infer<typeof InboxSourceSchema>;

export const InboxItemSchema = z.object({
  id: z.string(),
  source: InboxSourceSchema,
  title: z.string(),
  summary: z.string(),
  status: z.string(),
  severity: z.string(),
  assignedTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  relatedUserId: z.string().nullable(),
  relatedUserEmail: z.string().nullable(),
});

export type InboxItem = z.infer<typeof InboxItemSchema>;

export const InboxFiltersSchema = z.object({
  source: InboxSourceSchema.optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  severity: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type InboxFilters = z.infer<typeof InboxFiltersSchema>;

const OVER_FETCH_LIMIT = 200;

const normalizeSeverity = (severity: string): string => {
  const mapping: Record<string, string> = {
    critical: 'critical',
    urgent: 'critical',
    high: 'high',
    medium: 'medium',
    normal: 'medium',
    low: 'low',
  };
  return mapping[severity] ?? severity;
};

const reportToInboxItem = (report: Report): InboxItem => ({
  id: report.reportId,
  source: 'moderation',
  title: report.title,
  summary: report.description.substring(0, 120),
  status: report.status,
  severity: normalizeSeverity(report.severity),
  assignedTo: report.assignedModerator ?? null,
  createdAt: report.createdAt.toISOString(),
  updatedAt: report.updatedAt.toISOString(),
  relatedUserId: report.reportedUserId ?? null,
  relatedUserEmail: null,
});

const ticketToInboxItem = (ticket: SupportTicket): InboxItem => ({
  id: ticket.ticketId,
  source: 'support',
  title: ticket.subject,
  summary: ticket.description.substring(0, 120),
  status: ticket.status,
  severity: normalizeSeverity(ticket.priority),
  assignedTo: ticket.assignedTo ?? null,
  createdAt: ticket.createdAt.toISOString(),
  updatedAt: ticket.updatedAt.toISOString(),
  relatedUserId: ticket.userId ?? null,
  relatedUserEmail: ticket.userEmail,
});

const chatToInboxItem = (
  chat: Chat & { Participants?: Array<{ user_id: string; User?: { email: string } }> }
): InboxItem => {
  const firstParticipant = chat.Participants?.[0];
  return {
    id: chat.chat_id,
    source: 'message',
    title: `Chat #${chat.chat_id.slice(-6)}`,
    summary: `${chat.status} conversation with ${chat.Participants?.length ?? 0} participants`,
    status: chat.status,
    severity: chat.status === ChatStatus.LOCKED ? 'high' : 'medium',
    assignedTo: chat.assigned_to ?? null,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    relatedUserId: firstParticipant?.user_id ?? null,
    relatedUserEmail: firstParticipant?.User?.email ?? null,
  };
};

const fetchReports = async (filters: InboxFilters): Promise<ReadonlyArray<InboxItem>> => {
  if (filters.source && filters.source !== 'moderation') {
    return [];
  }

  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.severity) {
    where.severity = filters.severity;
  }
  if (filters.assignedTo) {
    where.assignedModerator = filters.assignedTo;
  }
  if (filters.search) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${filters.search}%` } },
      { description: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const reports = await Report.findAll({
    where,
    limit: OVER_FETCH_LIMIT,
    order: [[filters.sortBy ?? 'createdAt', filters.sortOrder ?? 'desc']],
  });

  return reports.map(reportToInboxItem);
};

const fetchTickets = async (filters: InboxFilters): Promise<ReadonlyArray<InboxItem>> => {
  if (filters.source && filters.source !== 'support') {
    return [];
  }

  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.severity) {
    where.priority = filters.severity;
  }
  if (filters.assignedTo) {
    where.assignedTo = filters.assignedTo;
  }
  if (filters.search) {
    where[Op.or as unknown as string] = [
      { subject: { [Op.iLike]: `%${filters.search}%` } },
      { description: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const tickets = await SupportTicket.findAll({
    where,
    limit: OVER_FETCH_LIMIT,
    order: [[filters.sortBy ?? 'createdAt', filters.sortOrder ?? 'desc']],
  });

  return tickets.map(ticketToInboxItem);
};

const fetchChats = async (filters: InboxFilters): Promise<ReadonlyArray<InboxItem>> => {
  if (filters.source && filters.source !== 'message') {
    return [];
  }

  const where: Record<string, unknown> = {};

  // For inbox, only show active/locked chats (not archived)
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { [Op.in]: [ChatStatus.ACTIVE, ChatStatus.LOCKED] };
  }
  if (filters.assignedTo) {
    where.assigned_to = filters.assignedTo;
  }

  const chats = await Chat.findAll({
    where,
    limit: OVER_FETCH_LIMIT,
    include: [
      {
        model: ChatParticipant,
        as: 'Participants',
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['email'],
          },
        ],
      },
    ],
    order: [
      [filters.sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt', filters.sortOrder ?? 'desc'],
    ],
  });

  const items = chats.map(chatToInboxItem);

  // Apply text search filter in-memory for chats (no title/description columns)
  if (filters.search) {
    const term = filters.search.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        (item.relatedUserEmail && item.relatedUserEmail.toLowerCase().includes(term))
    );
  }

  return items;
};

export const getInboxItems = async (
  filters: InboxFilters
): Promise<{
  data: ReadonlyArray<InboxItem>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const [reports, tickets, chats] = await Promise.all([
    fetchReports(filters),
    fetchTickets(filters),
    fetchChats(filters),
  ]);

  const merged = [...reports, ...tickets, ...chats];

  const sortField = filters.sortBy ?? 'createdAt';
  const sortDir = filters.sortOrder ?? 'desc';
  merged.sort((a, b) => {
    const aVal = new Date(a[sortField]).getTime();
    const bVal = new Date(b[sortField]).getTime();
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const total = merged.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = merged.slice(start, start + limit);

  return { data, pagination: { page, limit, total, totalPages } };
};

export const assignInboxItem = async (
  itemId: string,
  source: InboxSource,
  assignedTo: string
): Promise<void> => {
  switch (source) {
    case 'moderation': {
      const report = await Report.findByPk(itemId);
      if (!report) {
        throw new Error('Report not found');
      }
      await report.update({
        assignedModerator: assignedTo,
        assignedAt: new Date(),
        status: report.status === ReportStatus.PENDING ? ReportStatus.UNDER_REVIEW : report.status,
      });
      break;
    }
    case 'support': {
      const ticket = await SupportTicket.findByPk(itemId);
      if (!ticket) {
        throw new Error('Support ticket not found');
      }
      await ticket.update({
        assignedTo,
        status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status,
      });
      break;
    }
    case 'message': {
      const chat = await Chat.findByPk(itemId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      await chat.update({ assigned_to: assignedTo });
      break;
    }
  }
};
