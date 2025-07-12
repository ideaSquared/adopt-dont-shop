/**
 * Message Search Service
 * Backend service for full-text message search with indexing
 * Part of Phase 3 - Message Search Implementation
 */

import { Op, QueryTypes } from 'sequelize';
import { Chat, Message, User } from '../models';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';

export interface SearchOptions {
  query: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  startDate?: Date;
  endDate?: Date;
  messageType?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'sender';
  sortOrder?: 'ASC' | 'DESC';
}

export interface SearchResult {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  highlight?: string;
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  searchTime: number;
  suggestions?: string[];
}

export interface SearchSuggestion {
  query: string;
  count: number;
  type: 'popular' | 'recent' | 'autocomplete';
}

export class MessageSearchService {
  /**
   * Search messages with full-text search
   */
  static async searchMessages(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      query,
      userId,
      conversationId,
      senderId,
      startDate,
      endDate,
      messageType,
      page = 1,
      limit = 50,
      sortBy = 'relevance',
      sortOrder = 'DESC',
    } = options;

    try {
      const offset = (page - 1) * limit;
      const searchTerms = this.prepareSearchTerms(query);

      // Build base where conditions
      const whereConditions: Record<string, unknown> = {};

      if (conversationId) {
        whereConditions.chat_id = conversationId;
      }

      if (senderId) {
        whereConditions.sender_id = senderId;
      }

      if (messageType) {
        whereConditions.type = messageType;
      }

      if (startDate) {
        whereConditions.created_at = {
          ...((whereConditions.created_at as Record<string, unknown>) || {}),
          [Op.gte]: startDate,
        };
      }

      if (endDate) {
        whereConditions.created_at = {
          ...((whereConditions.created_at as Record<string, unknown>) || {}),
          [Op.lte]: endDate,
        };
      }

      // Add full-text search condition
      if (searchTerms.length > 0) {
        whereConditions.content = {
          [Op.or]: searchTerms.map(term => ({
            [Op.iLike]: `%${term}%`,
          })),
        };
      }

      // If userId is provided, filter by conversations user has access to
      const chatFilter = userId
        ? {
            include: [
              {
                model: Chat,
                as: 'Chat',
                include: [
                  {
                    model: sequelize.models.ChatParticipant,
                    as: 'Participants',
                    where: { participant_id: userId },
                    required: true,
                  },
                ],
                required: true,
              },
            ],
          }
        : {
            include: [
              {
                model: Chat,
                as: 'Chat',
              },
            ],
          };

      // Execute search query
      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: whereConditions,
        ...chatFilter,
        include: [
          ...(chatFilter.include || []),
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName', 'lastName'],
          },
        ],
        order: this.buildOrderClause(sortBy, sortOrder, searchTerms),
        limit,
        offset,
        distinct: true,
      });

      // Format results with highlighting
      const results: SearchResult[] = messages.map(message => {
        const sender = message.Sender as { firstName: string; lastName: string } | null;
        const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Unknown';

        return {
          id: message.message_id,
          conversationId: message.chat_id,
          content: message.content,
          senderId: message.sender_id,
          senderName,
          createdAt: message.created_at.toISOString(),
          highlight: this.highlightSearchTerms(message.content, searchTerms),
          relevanceScore: this.calculateRelevanceScore(message.content, searchTerms),
        };
      });

      const totalPages = Math.ceil(total / limit);
      const searchTime = Date.now() - startTime;

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(query, userId);

      logger.info('Message search completed', {
        query,
        total,
        page,
        searchTime,
        userId,
      });

      return {
        results,
        total,
        page,
        totalPages,
        query,
        searchTime,
        suggestions,
      };
    } catch (error) {
      logger.error('Message search failed:', {
        error: error instanceof Error ? error.message : String(error),
        query,
        userId,
        searchTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(query: string, userId?: string): Promise<SearchSuggestion[]> {
    try {
      // Get popular search terms from recent messages
      const popularTerms = await this.getPopularTerms(userId);

      // Get autocomplete suggestions
      const autocompleteSuggestions = await this.getAutocompleteSuggestions(query, userId);

      return [...autocompleteSuggestions, ...popularTerms].slice(0, 10);
    } catch (error) {
      logger.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Prepare search terms from query
   */
  private static prepareSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 2) // Only include terms longer than 2 characters
      .slice(0, 10); // Limit to 10 terms for performance
  }

  /**
   * Build order clause for search results
   */
  private static buildOrderClause(
    sortBy: string,
    sortOrder: string,
    _searchTerms: string[]
  ): Array<[string, string]> {
    switch (sortBy) {
      case 'relevance':
        // For relevance, we'll use created_at DESC as a proxy since Sequelize doesn't have built-in relevance scoring
        return [['created_at', 'DESC']];
      case 'date':
        return [['created_at', sortOrder]];
      case 'sender':
        return [
          ['sender_id', sortOrder],
          ['created_at', 'DESC'],
        ];
      default:
        return [['created_at', 'DESC']];
    }
  }

  /**
   * Highlight search terms in content
   */
  private static highlightSearchTerms(content: string, searchTerms: string[]): string {
    let highlighted = content;

    searchTerms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  /**
   * Calculate relevance score for a message
   */
  private static calculateRelevanceScore(content: string, searchTerms: string[]): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    searchTerms.forEach(term => {
      const termCount = (lowerContent.match(new RegExp(this.escapeRegex(term), 'g')) || []).length;
      score += termCount * (term.length > 4 ? 2 : 1); // Longer terms get higher weight
    });

    // Normalize score by content length
    return Math.round((score / content.length) * 1000);
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get popular search terms from recent messages
   */
  private static async getPopularTerms(userId?: string): Promise<SearchSuggestion[]> {
    try {
      const chatFilter = userId
        ? `
        AND m.chat_id IN (
          SELECT DISTINCT cp.chat_id 
          FROM chat_participants cp 
          WHERE cp.participant_id = :userId
        )
      `
        : '';

      const query = `
        SELECT 
          word,
          COUNT(*) as count
        FROM (
          SELECT 
            unnest(string_to_array(lower(regexp_replace(content, '[^a-zA-Z0-9\\s]', '', 'g')), ' ')) as word
          FROM messages m
          WHERE m.created_at > NOW() - INTERVAL '30 days'
            AND char_length(content) > 0
            ${chatFilter}
        ) words
        WHERE char_length(word) > 3
        GROUP BY word
        HAVING COUNT(*) > 5
        ORDER BY count DESC
        LIMIT 5;
      `;

      const results = (await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { userId },
      })) as Array<{ word: string; count: number }>;

      return results.map(result => ({
        query: result.word,
        count: Number(result.count),
        type: 'popular' as const,
      }));
    } catch (error) {
      logger.error('Failed to get popular terms:', error);
      return [];
    }
  }

  /**
   * Get autocomplete suggestions based on partial query
   */
  private static async getAutocompleteSuggestions(
    query: string,
    userId?: string
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const chatFilter = userId
        ? `
        AND m.chat_id IN (
          SELECT DISTINCT cp.chat_id 
          FROM chat_participants cp 
          WHERE cp.participant_id = :userId
        )
      `
        : '';

      const suggestionQuery = `
        SELECT DISTINCT
          regexp_split_to_table(lower(content), '\\s+') as word
        FROM messages m
        WHERE lower(content) LIKE :queryPattern
          AND char_length(content) > 0
          AND created_at > NOW() - INTERVAL '7 days'
          ${chatFilter}
        LIMIT 20;
      `;

      const results = (await sequelize.query(suggestionQuery, {
        type: QueryTypes.SELECT,
        replacements: {
          queryPattern: `%${query.toLowerCase()}%`,
          userId,
        },
      })) as Array<{ word: string }>;

      return results
        .filter(
          result =>
            result.word.toLowerCase().startsWith(query.toLowerCase()) &&
            result.word.length > query.length
        )
        .slice(0, 5)
        .map(result => ({
          query: result.word,
          count: 1,
          type: 'autocomplete' as const,
        }));
    } catch (error) {
      logger.error('Failed to get autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive search suggestions
   */
  private static async generateSearchSuggestions(
    query: string,
    userId?: string
  ): Promise<string[]> {
    const suggestions = await this.getSearchSuggestions(query, userId);
    return suggestions.map(s => s.query);
  }
}
