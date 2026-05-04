/**
 * Centralised data-testid constants used as a fallback when role/label/text
 * selectors aren't sufficient. Prefer Playwright's semantic locators
 * (getByRole, getByLabel, getByText) over these in tests — these exist so we
 * can update them in one place if the UI introduces or renames test ids.
 */
export const TEST_IDS = {
  navbar: {
    notificationBell: 'notification-bell',
    notificationBadge: 'notification-badge',
    userMenu: 'user-menu',
    logoutButton: 'logout-button',
  },
  pets: {
    card: 'pet-card',
    favouriteButton: 'pet-favourite-button',
    applyButton: 'pet-apply-button',
    statusBadge: 'pet-status-badge',
  },
  applications: {
    statusBadge: 'application-status',
    timeline: 'application-timeline',
    submitButton: 'application-submit',
    documentUploadInput: 'application-document-upload',
  },
  chat: {
    threadList: 'chat-thread-list',
    messageInput: 'chat-message-input',
    sendButton: 'chat-send-button',
    message: 'chat-message',
  },
} as const;

export const dataTestId = (id: string): string => `[data-testid="${id}"]`;
