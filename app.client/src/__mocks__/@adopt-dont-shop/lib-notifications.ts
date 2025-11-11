export class NotificationsService {
  getNotifications = jest.fn(() => Promise.resolve([]));
  markAsRead = jest.fn(() => Promise.resolve());
  markAllAsRead = jest.fn(() => Promise.resolve());
  clearAll = jest.fn(() => Promise.resolve());
}

export type Notification = {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};
