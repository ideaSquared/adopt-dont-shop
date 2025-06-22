import EmailTemplate, {
  TemplateCategory,
  TemplateStatus,
  TemplateType,
} from '../models/EmailTemplate';
import logger from '../utils/logger';

interface DefaultTemplate {
  name: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'date';
    description: string;
    required: boolean;
  }>;
  locale: string;
  isDefault: boolean;
  priority: number;
  tags: string[];
}

class EmailTemplateService {
  private defaultTemplates: DefaultTemplate[] = [
    // Welcome Email
    {
      name: 'Welcome Email',
      description: 'Welcome email sent to new users after registration',
      type: TemplateType.TRANSACTIONAL,
      category: TemplateCategory.WELCOME,
      subject: 'Welcome to {{system.appName}}, {{user.firstName}}!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to {{system.appName}}</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to {{system.appName}}!</h1>
            </div>
            <div class="content">
              <h2>Hi {{user.firstName}},</h2>
              <p>Thank you for joining {{system.appName}}! We're excited to help you find your perfect furry companion.</p>
              <p>Here's what you can do next:</p>
              <ul>
                <li>Complete your profile to help rescues get to know you better</li>
                <li>Browse available pets in your area</li>
                <li>Start conversations with rescue organizations</li>
                <li>Submit adoption applications for pets you're interested in</li>
              </ul>
              <p style="text-align: center; margin: 30px 0;">
                <a href="{{system.baseUrl}}/dashboard" class="button">Get Started</a>
              </p>
              <p>If you have any questions, feel free to reach out to our support team at {{system.supportEmail}}.</p>
              <p>Happy pet hunting!</p>
              <p>The {{system.appName}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; {{system.year}} {{system.appName}}. All rights reserved.</p>
              <p><a href="{{system.baseUrl}}/unsubscribe/{{user.unsubscribeToken}}">Unsubscribe</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `Welcome to {{system.appName}}, {{user.firstName}}!

Thank you for joining {{system.appName}}! We're excited to help you find your perfect furry companion.

Here's what you can do next:
- Complete your profile to help rescues get to know you better
- Browse available pets in your area
- Start conversations with rescue organizations
- Submit adoption applications for pets you're interested in

Get started: {{system.baseUrl}}/dashboard

If you have any questions, feel free to reach out to our support team at {{system.supportEmail}}.

Happy pet hunting!
The {{system.appName}} Team

© {{system.year}} {{system.appName}}. All rights reserved.
Unsubscribe: {{system.baseUrl}}/unsubscribe/{{user.unsubscribeToken}}`,
      variables: [
        { name: 'user.firstName', type: 'string', description: 'User first name', required: true },
        {
          name: 'user.unsubscribeToken',
          type: 'string',
          description: 'Unsubscribe token',
          required: true,
        },
        { name: 'system.appName', type: 'string', description: 'Application name', required: true },
        { name: 'system.baseUrl', type: 'string', description: 'Base URL', required: true },
        {
          name: 'system.supportEmail',
          type: 'string',
          description: 'Support email',
          required: true,
        },
        { name: 'system.year', type: 'number', description: 'Current year', required: true },
      ],
      locale: 'en',
      isDefault: true,
      priority: 10,
      tags: ['welcome', 'onboarding', 'user'],
    },

    // Password Reset
    {
      name: 'Password Reset',
      description: 'Password reset email with reset link',
      type: TemplateType.TRANSACTIONAL,
      category: TemplateCategory.PASSWORD_RESET,
      subject: 'Reset your {{system.appName}} password',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi {{user.firstName}},</h2>
              <p>We received a request to reset your password for your {{system.appName}} account.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
              </p>
              <div class="warning">
                <strong>Security Note:</strong> This link will expire in {{expiryHours}} hours for your security. 
                If you didn't request this password reset, please ignore this email.
              </div>
              <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
              <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
              <p>If you need help, contact our support team at {{system.supportEmail}}.</p>
              <p>The {{system.appName}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; {{system.year}} {{system.appName}}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `Password Reset Request - {{system.appName}}

Hi {{user.firstName}},

We received a request to reset your password for your {{system.appName}} account.

Reset your password: {{resetUrl}}

Security Note: This link will expire in {{expiryHours}} hours for your security. 
If you didn't request this password reset, please ignore this email.

If you need help, contact our support team at {{system.supportEmail}}.

The {{system.appName}} Team

© {{system.year}} {{system.appName}}. All rights reserved.`,
      variables: [
        { name: 'user.firstName', type: 'string', description: 'User first name', required: true },
        { name: 'resetUrl', type: 'string', description: 'Password reset URL', required: true },
        {
          name: 'expiryHours',
          type: 'number',
          description: 'Reset link expiry hours',
          required: true,
        },
        { name: 'system.appName', type: 'string', description: 'Application name', required: true },
        {
          name: 'system.supportEmail',
          type: 'string',
          description: 'Support email',
          required: true,
        },
        { name: 'system.year', type: 'number', description: 'Current year', required: true },
      ],
      locale: 'en',
      isDefault: true,
      priority: 10,
      tags: ['password', 'security', 'reset'],
    },

    // Application Update
    {
      name: 'Application Status Update',
      description: 'Notification when adoption application status changes',
      type: TemplateType.NOTIFICATION,
      category: TemplateCategory.APPLICATION_UPDATE,
      subject: 'Your application for {{pet.name}} has been {{application.status}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Application Update</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .pet-info { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .button { background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; }
            .status-approved { color: #4CAF50; font-weight: bold; }
            .status-pending { color: #FF9800; font-weight: bold; }
            .status-rejected { color: #f44336; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <h2>Hi {{user.firstName}},</h2>
              <p>We have an update on your adoption application!</p>
              
              <div class="pet-info">
                <h3>{{pet.name}}</h3>
                <p><strong>Breed:</strong> {{pet.breed}}</p>
                <p><strong>Age:</strong> {{pet.age}}</p>
                <p><strong>Rescue:</strong> {{rescue.name}}</p>
              </div>

              <p>Your application status has been updated to: 
                <span class="status-{{application.status}}">{{application.status | upper}}</span>
              </p>

              {{#if application.message}}
              <p><strong>Message from {{rescue.name}}:</strong></p>
              <p style="font-style: italic; background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2196F3;">
                {{application.message}}
              </p>
              {{/if}}

              <p style="text-align: center; margin: 30px 0;">
                <a href="{{system.baseUrl}}/applications/{{application.applicationId}}" class="button">View Application</a>
              </p>

              <p>If you have any questions, feel free to contact {{rescue.name}} directly or reach out to our support team.</p>
              <p>Thank you for choosing adoption!</p>
              <p>The {{system.appName}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; {{system.year}} {{system.appName}}. All rights reserved.</p>
              <p><a href="{{system.baseUrl}}/unsubscribe/{{user.unsubscribeToken}}">Unsubscribe</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      variables: [
        { name: 'user.firstName', type: 'string', description: 'User first name', required: true },
        { name: 'pet.name', type: 'string', description: 'Pet name', required: true },
        { name: 'pet.breed', type: 'string', description: 'Pet breed', required: true },
        { name: 'pet.age', type: 'string', description: 'Pet age', required: true },
        { name: 'rescue.name', type: 'string', description: 'Rescue name', required: true },
        {
          name: 'application.status',
          type: 'string',
          description: 'Application status',
          required: true,
        },
        {
          name: 'application.applicationId',
          type: 'string',
          description: 'Application ID',
          required: true,
        },
        {
          name: 'application.message',
          type: 'string',
          description: 'Message from rescue',
          required: false,
        },
      ],
      locale: 'en',
      isDefault: true,
      priority: 9,
      tags: ['application', 'status', 'notification'],
    },

    // Adoption Confirmation
    {
      name: 'Adoption Confirmation',
      description: 'Congratulations email when adoption is confirmed',
      type: TemplateType.TRANSACTIONAL,
      category: TemplateCategory.ADOPTION_CONFIRMATION,
      subject: 'Congratulations! Your adoption of {{pet.name}} is confirmed! 🎉',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Adoption Confirmed!</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .celebration { text-align: center; font-size: 48px; margin: 20px 0; }
            .pet-info { background-color: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; border: 2px solid #4CAF50; }
            .next-steps { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Adoption Confirmed!</h1>
            </div>
            <div class="content">
              <div class="celebration">🎉 🐕 🎊</div>
              
              <h2>Congratulations {{user.firstName}}!</h2>
              <p>We're thrilled to confirm that your adoption application has been approved and your new furry family member is ready to come home!</p>
              
              <div class="pet-info">
                <h3>Meet Your New Family Member: {{pet.name}}</h3>
                <p><strong>Breed:</strong> {{pet.breed}}</p>
                <p><strong>Age:</strong> {{pet.age}}</p>
                <p><strong>Rescue:</strong> {{rescue.name}}</p>
                <p><strong>Adoption Date:</strong> {{adoption.date}}</p>
              </div>

              <div class="next-steps">
                <h3>Next Steps:</h3>
                <ol>
                  <li>{{rescue.name}} will contact you within 24 hours to arrange pickup</li>
                  <li>Prepare your home with the items on the checklist we provided</li>
                  <li>Schedule a vet appointment within the first week</li>
                  <li>Give {{pet.name}} time to adjust to their new environment</li>
                </ol>
              </div>

              <p><strong>Contact Information:</strong></p>
              <p>{{rescue.name}}<br>
              Email: {{rescue.contactEmail}}<br>
              Phone: {{rescue.contactPhone}}</p>

              <p>Thank you for choosing adoption and giving {{pet.name}} a loving forever home. You're making a real difference in their life!</p>
              
              <p>We'd love to hear how {{pet.name}} is settling in. Feel free to share updates and photos with us!</p>
              
              <p>Congratulations again!</p>
              <p>The {{system.appName}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; {{system.year}} {{system.appName}}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      variables: [
        { name: 'user.firstName', type: 'string', description: 'User first name', required: true },
        { name: 'pet.name', type: 'string', description: 'Pet name', required: true },
        { name: 'pet.breed', type: 'string', description: 'Pet breed', required: true },
        { name: 'pet.age', type: 'string', description: 'Pet age', required: true },
        { name: 'rescue.name', type: 'string', description: 'Rescue name', required: true },
        {
          name: 'rescue.contactEmail',
          type: 'string',
          description: 'Rescue contact email',
          required: true,
        },
        {
          name: 'rescue.contactPhone',
          type: 'string',
          description: 'Rescue contact phone',
          required: false,
        },
        { name: 'adoption.date', type: 'string', description: 'Adoption date', required: true },
      ],
      locale: 'en',
      isDefault: true,
      priority: 10,
      tags: ['adoption', 'confirmation', 'congratulations'],
    },

    // Email Verification
    {
      name: 'Email Verification',
      description: 'Email verification link for new accounts',
      type: TemplateType.TRANSACTIONAL,
      category: TemplateCategory.EMAIL_VERIFICATION,
      subject: 'Please verify your {{system.appName}} email address',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
              <h2>Hi {{user.firstName}},</h2>
              <p>Thank you for signing up for {{system.appName}}! To complete your registration and start helping pets find their forever homes, please verify your email address.</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
              </p>

              <div class="warning">
                <strong>Important:</strong> This verification link will expire in {{expiryHours}} hours. 
                If you didn't create an account with {{system.appName}}, please ignore this email.
              </div>

              <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
              <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>

              <p>After verification, you'll be able to:</p>
              <ul>
                <li>Browse and search for pets available for adoption</li>
                <li>Connect with rescue organizations</li>
                <li>Submit adoption applications</li>
                <li>Message with rescues about pets you're interested in</li>
              </ul>

              <p>If you need help, contact our support team at {{system.supportEmail}}.</p>
              <p>The {{system.appName}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; {{system.year}} {{system.appName}}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      variables: [
        { name: 'user.firstName', type: 'string', description: 'User first name', required: true },
        {
          name: 'verificationUrl',
          type: 'string',
          description: 'Email verification URL',
          required: true,
        },
        {
          name: 'expiryHours',
          type: 'number',
          description: 'Verification link expiry hours',
          required: true,
        },
      ],
      locale: 'en',
      isDefault: true,
      priority: 10,
      tags: ['verification', 'email', 'registration'],
    },
  ];

  public async createDefaultTemplates(createdBy: string): Promise<EmailTemplate[]> {
    const createdTemplates: EmailTemplate[] = [];

    for (const templateData of this.defaultTemplates) {
      try {
        // Check if template already exists
        const existing = await EmailTemplate.findOne({
          where: { name: templateData.name },
        });

        if (existing) {
          logger.info(`Template "${templateData.name}" already exists, skipping...`);
          continue;
        }

        // Create the template
        const template = await EmailTemplate.create({
          ...templateData,
          status: TemplateStatus.ACTIVE,
          versions: [
            {
              version: 1,
              subject: templateData.subject,
              htmlContent: templateData.htmlContent,
              textContent: templateData.textContent,
              createdAt: new Date(),
              createdBy,
            },
          ],
          currentVersion: 1,
          usageCount: 0,
          testEmailsSent: 0,
          createdBy,
        });

        createdTemplates.push(template);
        logger.info(`Created default template: ${templateData.name}`);
      } catch (error) {
        logger.error(`Failed to create template "${templateData.name}":`, error);
      }
    }

    logger.info(`Created ${createdTemplates.length} default email templates`);
    return createdTemplates;
  }

  public async getDefaultTemplate(
    category: TemplateCategory,
    locale: string = 'en'
  ): Promise<EmailTemplate | null> {
    return await EmailTemplate.findOne({
      where: {
        category,
        locale,
        isDefault: true,
        status: TemplateStatus.ACTIVE,
      },
      order: [['priority', 'DESC']],
    });
  }

  public getDefaultTemplateDefinitions(): DefaultTemplate[] {
    return this.defaultTemplates;
  }
}

export default new EmailTemplateService();
