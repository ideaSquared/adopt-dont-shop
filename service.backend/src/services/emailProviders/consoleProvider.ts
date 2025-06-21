import EmailQueue from '../../models/EmailQueue';
import logger from '../../utils/logger';
import { BaseEmailProvider } from './baseProvider';

export class ConsoleEmailProvider extends BaseEmailProvider {
  constructor() {
    super({});
  }

  async send(email: EmailQueue): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const sanitized = this.sanitizeEmail(email);
      const messageId = this.generateMessageId();

      // Log the email to console with formatting
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL SENT VIA CONSOLE PROVIDER');
      console.log('='.repeat(80));
      console.log(`📨 Message ID: ${messageId}`);
      console.log(`📤 From: ${sanitized.from}`);
      console.log(`📥 To: ${sanitized.to}`);

      if (email.ccEmails && email.ccEmails.length > 0) {
        console.log(`📋 CC: ${email.ccEmails.join(', ')}`);
      }

      if (email.bccEmails && email.bccEmails.length > 0) {
        console.log(`📋 BCC: ${email.bccEmails.join(', ')}`);
      }

      console.log(`📝 Subject: ${sanitized.subject}`);
      console.log(`🏷️  Priority: ${email.priority}`);
      console.log(`🏷️  Type: ${email.type}`);

      if (email.tags && email.tags.length > 0) {
        console.log(`🏷️  Tags: ${email.tags.join(', ')}`);
      }

      console.log('\n📄 HTML CONTENT:');
      console.log('-'.repeat(40));
      console.log(sanitized.html);

      if (sanitized.text) {
        console.log('\n📄 TEXT CONTENT:');
        console.log('-'.repeat(40));
        console.log(sanitized.text);
      }

      if (email.attachments && email.attachments.length > 0) {
        console.log('\n📎 ATTACHMENTS:');
        console.log('-'.repeat(40));
        email.attachments.forEach((attachment, index) => {
          console.log(
            `${index + 1}. ${attachment.filename} (${attachment.contentType}) - ${attachment.size} bytes`
          );
        });
      }

      if (email.templateData && Object.keys(email.templateData).length > 0) {
        console.log('\n🔧 TEMPLATE DATA:');
        console.log('-'.repeat(40));
        console.log(JSON.stringify(email.templateData, null, 2));
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ EMAIL DELIVERED TO CONSOLE');
      console.log('='.repeat(80) + '\n');

      // Log to application logger as well
      logger.info(`Console email sent: ${messageId} to ${email.toEmail}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      logger.error('Console email provider error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getName(): string {
    return 'Console Email Provider';
  }

  validateConfiguration(): boolean {
    return true; // Console provider doesn't need configuration
  }
}
