import {
  ARCHIVE_CONVERSATION,
  CHAT_ENDPOINTS,
  CONVERSATION_BY_ID,
  CONVERSATION_STATS,
  CONVERSATIONS,
  DELETE_CONVERSATION,
  DOWNLOAD_ATTACHMENT,
  MARK_AS_READ,
  MESSAGE_BY_ID,
  MESSAGES,
  SEND_MESSAGE,
  START_CONVERSATION,
  TYPING_STATUS,
  UPLOAD_ATTACHMENT,
} from '../endpoints';

describe('CHAT_ENDPOINTS', () => {
  it('exposes static collection endpoints', () => {
    expect(CONVERSATIONS).toBe('/api/v1/conversations');
    expect(START_CONVERSATION).toBe('/api/v1/conversations/start');
    expect(CHAT_ENDPOINTS.SEARCH_MESSAGES).toBe('/api/v1/conversations/messages/search');
    expect(CHAT_ENDPOINTS.USER_PRESENCE).toBe('/api/v1/chat/presence');
  });

  it('builds conversation-scoped paths from an id', () => {
    expect(CONVERSATION_BY_ID('c-1')).toBe('/api/v1/conversations/c-1');
    expect(ARCHIVE_CONVERSATION('c-1')).toBe('/api/v1/conversations/c-1/archive');
    expect(DELETE_CONVERSATION('c-1')).toBe('/api/v1/conversations/c-1');
    expect(MARK_AS_READ('c-1')).toBe('/api/v1/conversations/c-1/read');
    expect(TYPING_STATUS('c-1')).toBe('/api/v1/conversations/c-1/typing');
    expect(UPLOAD_ATTACHMENT('c-1')).toBe('/api/v1/conversations/c-1/attachments');
    expect(CONVERSATION_STATS('c-1')).toBe('/api/v1/conversations/c-1/stats');
  });

  it('builds message endpoints from conversation and message ids', () => {
    expect(MESSAGES('c-1')).toBe('/api/v1/conversations/c-1/messages');
    expect(SEND_MESSAGE('c-1')).toBe('/api/v1/conversations/c-1/messages');
    expect(MESSAGE_BY_ID('c-1', 'm-1')).toBe('/api/v1/conversations/c-1/messages/m-1');
    expect(DOWNLOAD_ATTACHMENT('c-1', 'a-1')).toBe('/api/v1/conversations/c-1/attachments/a-1');
  });

  it('keeps the destructured helpers referencing the same builders as the object', () => {
    expect(CONVERSATION_BY_ID('x')).toBe(CHAT_ENDPOINTS.CONVERSATION_BY_ID('x'));
    expect(MESSAGES('x')).toBe(CHAT_ENDPOINTS.MESSAGES('x'));
  });
});
