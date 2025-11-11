/**
 * Mock for @adopt-dont-shop/lib-chat
 */

export class ChatService {
  getConversations = jest.fn(() => Promise.resolve([]));
  getMessages = jest.fn(() => Promise.resolve([]));
  sendMessage = jest.fn(() => Promise.resolve({}));
  deleteMessage = jest.fn(() => Promise.resolve());
}

export const chatService = new ChatService();
