import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchMessagesRequest, GetSearchSuggestionsRequest } from '@adopt-dont-shop/proto';

import type { ChatClient } from '../grpc-clients/chat-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';

import { registerSearchRoutes } from './search.js';

// --- Mock factories ---------------------------------------------------

function makeChatClient(): ChatClient & { searchMessagesMock: ReturnType<typeof vi.fn> } {
  const searchMessagesMock = vi.fn();
  return {
    searchMessages: searchMessagesMock,
    close: vi.fn(),
    searchMessagesMock,
  } as ChatClient & { searchMessagesMock: ReturnType<typeof vi.fn> };
}

function makePetsClient(): PetsClient & {
  getSearchSuggestionsMock: ReturnType<typeof vi.fn>;
} {
  const getSearchSuggestionsMock = vi.fn();
  return {
    getSearchSuggestions: getSearchSuggestionsMock,
    close: vi.fn(),
    getSearchSuggestionsMock,
  } as PetsClient & { getSearchSuggestionsMock: ReturnType<typeof vi.fn> };
}

async function buildApp(chatClient: ChatClient, petsClient: PetsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerSearchRoutes(app, { chatClient, petsClient });
  return app;
}

const MESSAGE_HIT = {
  messageId: 'msg-1',
  chatId: 'chat-1',
  senderUserId: 'usr-1',
  body: 'About the adoption',
  reactions: [],
  createdAt: '2026-06-01T00:30:00Z',
};

// --- GET /api/v1/search/messages --------------------------------------

describe('GET /api/v1/search/messages', () => {
  let app: FastifyInstance;
  let chatClient: ReturnType<typeof makeChatClient>;
  let petsClient: ReturnType<typeof makePetsClient>;

  beforeEach(async () => {
    chatClient = makeChatClient();
    petsClient = makePetsClient();
    app = await buildApp(chatClient, petsClient);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the raw MessageSearchResponse shape lib.search expects', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({
      hits: [MESSAGE_HIT],
      page: 1,
      limit: 20,
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=adoption',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results).toEqual([
      {
        id: 'msg-1',
        conversationId: 'chat-1',
        content: 'About the adoption',
        senderId: 'usr-1',
        senderName: '',
        createdAt: '2026-06-01T00:30:00Z',
      },
    ]);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
    expect(body.hasNext).toBe(false);
    expect(body.hasPrev).toBe(false);
    expect(typeof body.queryTime).toBe('number');
  });

  it('maps the q/conversationId query params onto the gRPC request', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 20, total: 0 });

    await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=adoption&conversationId=chat-1&page=2&limit=10',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = chatClient.searchMessagesMock.mock.calls[0] as [SearchMessagesRequest];
    expect(grpcReq).toEqual({ query: 'adoption', chatId: 'chat-1', page: 2, limit: 10 });
  });

  it('accepts `query` as an alias for `q`', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 20, total: 0 });

    await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?query=adoption',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = chatClient.searchMessagesMock.mock.calls[0] as [SearchMessagesRequest];
    expect(grpcReq.query).toBe('adoption');
  });

  it('computes hasNext/hasPrev/totalPages from page + limit + total', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({
      hits: [MESSAGE_HIT],
      page: 2,
      limit: 10,
      total: 25,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=adoption&page=2&limit=10',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const body = res.json();
    expect(body.totalPages).toBe(3);
    expect(body.hasNext).toBe(true);
    expect(body.hasPrev).toBe(true);
  });

  it('defaults query to an empty string when neither q nor query is passed', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 20, total: 0 });

    await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = chatClient.searchMessagesMock.mock.calls[0] as [SearchMessagesRequest];
    expect(grpcReq.query).toBe('');
  });

  it('reports 0 totalPages when the response limit is 0', async () => {
    chatClient.searchMessagesMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 0, total: 0 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=adoption',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.json().totalPages).toBe(0);
  });

  it('rejects an out-of-range limit with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=adoption&limit=9999',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(400);
    expect(chatClient.searchMessagesMock).not.toHaveBeenCalled();
  });

  it('maps INVALID_ARGUMENT from the handler → 400', async () => {
    chatClient.searchMessagesMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'query is required',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/messages?q=',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(400);
  });
});

// --- GET /api/v1/search/suggestions ------------------------------------

describe('GET /api/v1/search/suggestions', () => {
  let app: FastifyInstance;
  let chatClient: ReturnType<typeof makeChatClient>;
  let petsClient: ReturnType<typeof makePetsClient>;

  beforeEach(async () => {
    chatClient = makeChatClient();
    petsClient = makePetsClient();
    app = await buildApp(chatClient, petsClient);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns a raw SearchSuggestion[] array (no envelope)', async () => {
    petsClient.getSearchSuggestionsMock.mockResolvedValueOnce({
      suggestions: [{ text: 'Buddy', category: 'pet_name', count: 3 }],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggestions?q=bu',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ text: 'Buddy', type: 'query', count: 3, category: 'pet_name' }]);
    const [grpcReq] = petsClient.getSearchSuggestionsMock.mock.calls[0] as [
      GetSearchSuggestionsRequest,
    ];
    expect(grpcReq).toEqual({ query: 'bu', limit: 0 });
  });

  it('accepts `query` as an alias for `q`', async () => {
    petsClient.getSearchSuggestionsMock.mockResolvedValueOnce({ suggestions: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggestions?query=bu',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [grpcReq] = petsClient.getSearchSuggestionsMock.mock.calls[0] as [
      GetSearchSuggestionsRequest,
    ];
    expect(grpcReq.query).toBe('bu');
  });

  it('defaults query to an empty string when neither q nor query is passed', async () => {
    petsClient.getSearchSuggestionsMock.mockResolvedValueOnce({ suggestions: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggestions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [grpcReq] = petsClient.getSearchSuggestionsMock.mock.calls[0] as [
      GetSearchSuggestionsRequest,
    ];
    expect(grpcReq.query).toBe('');
  });

  it('returns an empty array for type=messages without calling pets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggestions?q=hi&type=messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    expect(petsClient.getSearchSuggestionsMock).not.toHaveBeenCalled();
  });

  it('maps PERMISSION_DENIED from the handler → 403', async () => {
    petsClient.getSearchSuggestionsMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'no perms',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggestions?q=bu',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(403);
  });
});
