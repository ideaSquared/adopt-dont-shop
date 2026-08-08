// REST → gRPC translation for /api/v1/search/{messages,suggestions} —
// backs the frontend lib.search contracts (packages/lib.search's
// SearchService). GET /api/v1/search/pets already lives in
// routes/matching.ts (SearchPets); this file covers the two remaining
// gaps flagged by the route audit (ADS-1142):
//
//   GET /api/v1/search/messages     → ChatService.SearchMessages
//   GET /api/v1/search/suggestions  → PetService.GetSearchSuggestions
//
// Both respond with the RAW shape lib.search's SearchService expects —
// ApiService.get() returns the parsed JSON body directly, unwrapped —
// so, unlike most other gateway routes, there is no {success,data}
// envelope here.
//
// Authz is delegated entirely to the two backing RPCs (chats.read /
// pets.read) — this file does no permission checks of its own.
//
// Faceted pet search (POST /api/v1/search/faceted in lib.search) is
// NOT implemented here — see routes/pets.ts's GET /api/v1/pets/facets
// for the facet-counts capability this ticket actually asked for. lib.search
// itself has no callers in any app today, so folding its generic
// results+facets combined endpoint (which would also need free-text
// pet search — a capability pets.List doesn't have) is deferred.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import type { SearchMessagesRequest } from '@adopt-dont-shop/proto';

import type { ChatClient } from '../grpc-clients/chat-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type SearchRoutesOptions = {
  chatClient: ChatClient;
  petsClient: PetsClient;
};

const SEARCH_RATE_LIMITS = {
  read: { max: 120, timeWindow: '1 minute' },
} as const;

export const registerSearchRoutes = async (
  app: FastifyInstance,
  opts: SearchRoutesOptions
): Promise<void> => {
  const { chatClient, petsClient } = opts;

  await app.register(rateLimit, { global: false });

  // GET /api/v1/search/messages — flat, participant-scoped message
  // search. Backs lib.search's searchMessages(); the response shape
  // matches MessageSearchResponse exactly (raw, no envelope).
  app.get(
    '/api/v1/search/messages',
    {
      config: { rateLimit: SEARCH_RATE_LIMITS.read },
      schema: {
        tags: ['search'],
        summary: 'Search within messages the caller can see',
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            query: { type: 'string' },
            conversationId: { type: 'string' },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const startedAt = Date.now();
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: SearchMessagesRequest = {
        query: query.q ?? query.query ?? '',
        chatId: query.conversationId,
        page: pagination.page,
        limit: pagination.limit,
      };
      try {
        const res = await chatClient.searchMessages(grpcReq, buildMetadata(req));
        const totalPages = res.limit > 0 ? Math.ceil(res.total / res.limit) : 0;
        return reply.send({
          results: res.hits.map(hit => ({
            id: hit.messageId,
            conversationId: hit.chatId,
            content: hit.body,
            senderId: hit.senderUserId,
            // Sender display names live in service.auth, not this
            // schema, and a per-hit cross-service lookup isn't worth
            // the fan-out on a search endpoint that can return up to
            // 100 hits — left blank. The SPA already caches display
            // names for chat participants from ListChats/ListMessages.
            senderName: '',
            createdAt: hit.createdAt,
          })),
          total: res.total,
          page: res.page,
          totalPages,
          hasNext: res.page < totalPages,
          hasPrev: res.page > 1,
          queryTime: Date.now() - startedAt,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/search/suggestions — typeahead suggestions. Backs
  // lib.search's getSearchSuggestions(). There's no chat-side
  // suggestion source (yet), so type=messages returns an empty array
  // rather than an error — type=pets / type=all both resolve against
  // the pet-name + breed autocomplete.
  app.get(
    '/api/v1/search/suggestions',
    {
      config: { rateLimit: SEARCH_RATE_LIMITS.read },
      schema: {
        tags: ['search'],
        summary: 'Typeahead search suggestions',
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            query: { type: 'string' },
            type: { type: 'string' },
          },
        },
        response: {
          200: { type: 'array', items: { type: 'object', additionalProperties: true } },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      if (query.type === 'messages') {
        return reply.send([]);
      }
      try {
        const res = await petsClient.getSearchSuggestions(
          { query: query.q ?? query.query ?? '', limit: 0 },
          buildMetadata(req)
        );
        return reply.send(
          res.suggestions.map(suggestion => ({
            text: suggestion.text,
            type: 'query' as const,
            count: suggestion.count,
            category: suggestion.category,
          }))
        );
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
