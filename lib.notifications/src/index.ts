// Main exports for @adopt-dont-shop/lib.notifications
export { NotificationsService } from './services/notifications-service';
export type { NotificationsServiceConfig, NotificationsServiceOptions } from './types';
export * from './types';
export { renderEmail } from './email/render-email';
export type {
  EmailTemplateData,
  RenderEmailOptions,
  RenderEmailResult,
} from './email/render-email';
export { welcomeEmailTemplate } from './email/templates/welcome';
