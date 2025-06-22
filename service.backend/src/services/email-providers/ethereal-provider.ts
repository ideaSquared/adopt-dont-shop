import nodemailer from 'nodemailer';
import EmailQueue from '../../models/EmailQueue';
import { logger } from '../../utils/logger';
import { BaseEmailProvider } from './base-provider';

export class EtherealProvider extends BaseEmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: any = null;

  constructor() {
    super({});
  }

  async initialize() {
    try {
      // Create test account
      this.testAccount = await nodemailer.createTestAccount();

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      logger.info('Ethereal Email Provider initialized', {
        user: this.testAccount.user,
        password: this.testAccount.pass,
        webUrl: 'https://ethereal.email',
      });
    } catch (error) {
      logger.error('Failed to initialize Ethereal provider:', error);
      throw error;
    }
  }

  async send(email: EmailQueue): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      await this.initialize();
    }

    try {
      const emailData = this.sanitizeEmail(email);
      const info = await this.transporter!.sendMail(emailData);

      logger.info('Email sent via Ethereal', {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
        to: emailData.to,
        subject: emailData.subject,
      });

      // In development, log the preview URL
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Preview Email: %s', nodemailer.getTestMessageUrl(info));
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Failed to send email via Ethereal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getName(): string {
    return 'Ethereal';
  }

  validateConfiguration(): boolean {
    return true; // Ethereal doesn't require external configuration
  }

  getPreviewInfo() {
    return {
      user: this.testAccount?.user,
      password: this.testAccount?.pass,
      webUrl: 'https://ethereal.email',
      inboxUrl: `https://ethereal.email/messages`,
    };
  }
}
