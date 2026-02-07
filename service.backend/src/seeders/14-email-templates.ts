import EmailTemplate, {
  TemplateCategory,
  TemplateStatus,
  TemplateType,
} from '../models/EmailTemplate';

const emailTemplateData = [
  {
    templateId: 'template_0000welc01',
    name: 'Welcome Email',
    type: TemplateType.TRANSACTIONAL,
    subject: "Welcome to Adopt Don't Shop! 🐾",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Adopt Don't Shop!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{firstName}},</p>
          <p>Thank you for joining our community of animal lovers! We're excited to help you find your perfect companion.</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Browse available pets in your area</li>
            <li>Set up your adoption preferences</li>
            <li>Connect with local rescue organizations</li>
            <li>Learn about the adoption process</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/pets" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Start Browsing Pets</a>
          </div>
          <p>If you have any questions, our support team is here to help!</p>
          <p>Happy pet hunting! 🐕🐱</p>
          <p>The Adopt Don't Shop Team</p>
        </div>
      </div>
    `,
    textContent: `
      Welcome to Adopt Don't Shop!
      
      Dear {{firstName}},
      
      Thank you for joining our community of animal lovers! We're excited to help you find your perfect companion.
      
      Here's what you can do next:
      - Browse available pets in your area
      - Set up your adoption preferences  
      - Connect with local rescue organizations
      - Learn about the adoption process
      
      Visit {{baseUrl}}/pets to start browsing pets.
      
      If you have any questions, our support team is here to help!
      
      Happy pet hunting!
      The Adopt Don't Shop Team
    `,
    category: TemplateCategory.WELCOME,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: [],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000recv01',
    name: 'Application Received',
    type: TemplateType.NOTIFICATION,
    subject: 'Application Received for {{petName}} 📋',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
          <h1>Application Received!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{applicantName}},</p>
          <p>Thank you for your application to adopt <strong>{{petName}}</strong>!</p>
          <p>We have received your application and our team at {{rescueName}} will review it carefully. Here's what happens next:</p>
          <ol>
            <li><strong>Initial Review</strong> - We'll review your application within 2-3 business days</li>
            <li><strong>Reference Check</strong> - We may contact your references</li>
            <li><strong>Interview</strong> - We'll schedule a phone or video interview</li>
            <li><strong>Meet & Greet</strong> - You'll meet {{petName}} in person</li>
            <li><strong>Home Visit</strong> - We may arrange a home visit if required</li>
          </ol>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Application ID:</strong> {{applicationId}}</p>
            <p><strong>Submitted:</strong> {{submittedDate}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/applications/{{applicationId}}" style="background-color: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">View Application Status</a>
          </div>
          <p>We'll keep you updated throughout the process. Feel free to reach out if you have any questions!</p>
          <p>Thank you for choosing to adopt!</p>
          <p>{{rescueName}} Team</p>
        </div>
      </div>
    `,
    textContent: `
      Application Received!
      
      Dear {{applicantName}},
      
      Thank you for your application to adopt {{petName}}!
      
      We have received your application and our team at {{rescueName}} will review it carefully.
      
      What happens next:
      1. Initial Review - We'll review your application within 2-3 business days
      2. Reference Check - We may contact your references
      3. Interview - We'll schedule a phone or video interview
      4. Meet & Greet - You'll meet {{petName}} in person
      5. Home Visit - We may arrange a home visit if required
      
      Application ID: {{applicationId}}
      Submitted: {{submittedDate}}
      
      View your application status at: {{baseUrl}}/applications/{{applicationId}}
      
      We'll keep you updated throughout the process. Feel free to reach out if you have any questions!
      
      Thank you for choosing to adopt!
      {{rescueName}} Team
    `,
    category: TemplateCategory.APPLICATION_UPDATE,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: [],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000appr01',
    name: 'Application Approved',
    type: TemplateType.NOTIFICATION,
    subject: '🎉 Great News! Your Application for {{petName}} is Approved!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>🎉 Congratulations!</h1>
          <h2>Your application has been approved!</h2>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{applicantName}},</p>
          <p>We are thrilled to let you know that your application to adopt <strong>{{petName}}</strong> has been approved!</p>
          <p>{{petName}} is excited to meet you and potentially become part of your family. Here are the next steps:</p>
          <ol>
            <li><strong>Schedule a Meet & Greet</strong> - Contact us to arrange a meeting with {{petName}}</li>
            <li><strong>Bring Required Items</strong> - We'll provide you with a list of what to bring</li>
            <li><strong>Complete Adoption</strong> - Finalize the adoption process and take {{petName}} home!</li>
          </ol>
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #4CAF50; margin-top: 0;">Contact Information:</h3>
            <p><strong>{{rescueName}}</strong></p>
            <p>📧 {{rescueEmail}}</p>
            <p>📞 {{rescuePhone}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/applications/{{applicationId}}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">View Application Details</a>
          </div>
          <p>We can't wait to see {{petName}} find their forever home with you!</p>
          <p>Congratulations and thank you for choosing to adopt!</p>
          <p>{{rescueName}} Team</p>
        </div>
      </div>
    `,
    textContent: `
      🎉 Congratulations! Your application has been approved!
      
      Dear {{applicantName}},
      
      We are thrilled to let you know that your application to adopt {{petName}} has been approved!
      
      {{petName}} is excited to meet you and potentially become part of your family.
      
      Next steps:
      1. Schedule a Meet & Greet - Contact us to arrange a meeting with {{petName}}
      2. Bring Required Items - We'll provide you with a list of what to bring
      3. Complete Adoption - Finalize the adoption process and take {{petName}} home!
      
      Contact Information:
      {{rescueName}}
      Email: {{rescueEmail}}
      Phone: {{rescuePhone}}
      
      View application details: {{baseUrl}}/applications/{{applicationId}}
      
      We can't wait to see {{petName}} find their forever home with you!
      
      Congratulations and thank you for choosing to adopt!
      {{rescueName}} Team
    `,
    category: TemplateCategory.APPLICATION_UPDATE,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: [],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000reje01',
    name: 'Application Not Approved',
    type: TemplateType.NOTIFICATION,
    subject: 'Update on Your Application for {{petName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center;">
          <h1>Application Update</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{applicantName}},</p>
          <p>Thank you for your interest in adopting <strong>{{petName}}</strong>. After careful consideration, we have decided that {{petName}} may not be the best match for your current situation.</p>
          {{#if rejectionReason}}
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #FF9800; margin: 20px 0;">
            <p><strong>Reason:</strong> {{rejectionReason}}</p>
          </div>
          {{/if}}
          <p>Please don't be discouraged! This decision is not a reflection of you as a person, but rather our commitment to finding the perfect match for each pet's unique needs.</p>
          <p>We encourage you to:</p>
          <ul>
            <li>Browse our other available pets who might be a better fit</li>
            <li>Consider visiting us to meet pets in person</li>
            <li>Stay connected for future pet arrivals</li>
            <li>Reach out if you have questions about this decision</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/pets" style="background-color: #FF9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Browse Other Pets</a>
          </div>
          <p>Thank you for choosing to adopt, and we hope to help you find your perfect companion soon!</p>
          <p>{{rescueName}} Team</p>
        </div>
      </div>
    `,
    textContent: `
      Application Update
      
      Dear {{applicantName}},
      
      Thank you for your interest in adopting {{petName}}. After careful consideration, we have decided that {{petName}} may not be the best match for your current situation.
      
      {{#if rejectionReason}}
      Reason: {{rejectionReason}}
      {{/if}}
      
      Please don't be discouraged! This decision is not a reflection of you as a person, but rather our commitment to finding the perfect match for each pet's unique needs.
      
      We encourage you to:
      - Browse our other available pets who might be a better fit
      - Consider visiting us to meet pets in person
      - Stay connected for future pet arrivals
      - Reach out if you have questions about this decision
      
      Browse other pets: {{baseUrl}}/pets
      
      Thank you for choosing to adopt, and we hope to help you find your perfect companion soon!
      
      {{rescueName}} Team
    `,
    category: TemplateCategory.APPLICATION_UPDATE,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: [],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000mesg01',
    name: 'New Message Notification',
    type: TemplateType.NOTIFICATION,
    subject: 'New message from {{senderName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #9C27B0; color: white; padding: 20px; text-align: center;">
          <h1>💬 New Message</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{recipientName}},</p>
          <p>You have received a new message from <strong>{{senderName}}</strong> {{#if rescueName}}at {{rescueName}}{{/if}}.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #9C27B0;">
            <p style="margin: 0; font-style: italic;">"{{messagePreview}}"</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/chat/{{chatId}}" style="background-color: #9C27B0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Read Full Message</a>
          </div>
          <p>Stay connected and don't miss any important updates about your adoption journey!</p>
          <p>The Adopt Don't Shop Team</p>
        </div>
      </div>
    `,
    textContent: `
      New Message
      
      Dear {{recipientName}},
      
      You have received a new message from {{senderName}}{{#if rescueName}} at {{rescueName}}{{/if}}.
      
      Message preview: "{{messagePreview}}"
      
      Read the full message: {{baseUrl}}/chat/{{chatId}}
      
      Stay connected and don't miss any important updates about your adoption journey!
      
      The Adopt Don't Shop Team
    `,
    category: TemplateCategory.NOTIFICATION_DIGEST,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: [],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000rwel01',
    name: 'Rescue Welcome Email',
    type: TemplateType.TRANSACTIONAL,
    subject: "Welcome to Adopt Don't Shop, {{rescueName}}! 🐾",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Adopt Don't Shop!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{rescueName}},</p>
          <p>Thank you for joining our platform! We're thrilled to have you as part of our community dedicated to finding loving homes for rescue animals.</p>
          <h3 style="color: #4CAF50;">What You Can Do Now:</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Add Your Pets</strong> - List available animals for adoption</li>
            <li><strong>Manage Applications</strong> - Review and process adoption applications</li>
            <li><strong>Connect with Adopters</strong> - Chat directly with potential families</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/rescue/dashboard" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
          </div>
          <p>Together, we're making a difference!</p>
          <p>The Adopt Don't Shop Team</p>
        </div>
      </div>
    `,
    textContent: `Welcome to Adopt Don't Shop!

Dear {{rescueName}},

Thank you for joining!`,
    category: TemplateCategory.WELCOME,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: ['rescue'],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000rapr01',
    name: 'Rescue Verification Approved',
    type: TemplateType.TRANSACTIONAL,
    subject: '🎉 {{rescueName}} Has Been Verified!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 30px; text-align: center;">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear {{rescueName}},</p>
          <p><strong>Great news!</strong> Your rescue has been verified on Adopt Don't Shop.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/rescue/pets/new" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Add Your First Pet</a>
          </div>
          <p>The Adopt Don't Shop Team</p>
        </div>
      </div>
    `,
    textContent: `Congratulations! Your rescue has been verified.`,
    category: TemplateCategory.RESCUE_VERIFICATION,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: ['rescue', 'verification'],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000rrem01',
    name: 'Rescue Profile Reminder',
    type: TemplateType.NOTIFICATION,
    subject: 'Time to Update Your Profile 📋',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
          <h1>📋 Profile Update Reminder</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello {{rescueName}},</p>
          <p>Time to update your rescue profile to keep information current!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/rescue/profile/edit" style="background-color: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Update Now</a>
          </div>
          <p>The Adopt Don't Shop Team</p>
        </div>
      </div>
    `,
    textContent: `Time to update your profile!`,
    category: TemplateCategory.REMINDER,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {},
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 0,
    tags: ['rescue', 'reminder'],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000ever01',
    name: 'Email Verification',
    type: TemplateType.TRANSACTIONAL,
    subject: "Verify Your Email Address - Adopt Don't Shop",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
        <div style="background-color: #4CAF50; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">🔐 Verify Your Email</h1>
        </div>
        <div style="background-color: white; padding: 40px; margin: 20px 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear {{firstName}},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for joining Adopt Don't Shop! To complete your registration and start your journey to find the perfect companion, please verify your email address.
          </p>
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </p>
          </div>
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{verificationUrl}}" style="background-color: #4CAF50; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 30px;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; color: #4CAF50; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-family: monospace;">
            {{verificationUrl}}
          </p>
          <div style="border-top: 1px solid #e0e0e0; margin-top: 35px; padding-top: 25px;">
            <p style="font-size: 13px; line-height: 1.6; color: #999;">
              <strong>Didn't create an account?</strong><br>
              If you didn't sign up for Adopt Don't Shop, you can safely ignore this email. No account will be created without verification.
            </p>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
            Once verified, you'll be able to:
          </p>
          <ul style="font-size: 15px; line-height: 1.8; color: #555;">
            <li>Browse available pets in your area</li>
            <li>Save your favorite pets</li>
            <li>Submit adoption applications</li>
            <li>Connect with rescue organizations</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
            We're excited to help you find your perfect companion! 🐕🐱
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Best regards,<br>
            <strong>The Adopt Don't Shop Team</strong>
          </p>
        </div>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 5px 0;">
            This is an automated message from Adopt Don't Shop.
          </p>
          <p style="margin: 5px 0;">
            Need help? Contact us at support@adoptdontshop.com
          </p>
        </div>
      </div>
    `,
    textContent: `
      Verify Your Email Address

      Dear {{firstName}},

      Thank you for joining Adopt Don't Shop! To complete your registration and start your journey to find the perfect companion, please verify your email address.

      ⏰ IMPORTANT: This verification link will expire in 24 hours.

      Click the link below to verify your email:
      {{verificationUrl}}

      Once verified, you'll be able to:
      - Browse available pets in your area
      - Save your favorite pets
      - Submit adoption applications
      - Connect with rescue organizations

      Didn't create an account?
      If you didn't sign up for Adopt Don't Shop, you can safely ignore this email. No account will be created without verification.

      We're excited to help you find your perfect companion!

      Best regards,
      The Adopt Don't Shop Team

      ---
      This is an automated message from Adopt Don't Shop.
      Need help? Contact us at support@adoptdontshop.com
    `,
    category: TemplateCategory.EMAIL_VERIFICATION,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {
      expirationHours: 24,
      priority: 'high',
      requiresAction: true,
    } as Record<string, string | number | boolean>,
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: true,
    priority: 10,
    tags: ['verification', 'security', 'onboarding'],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
  {
    templateId: 'template_0000evrem01',
    name: 'Email Verification Reminder',
    type: TemplateType.NOTIFICATION,
    subject: "Reminder: Verify Your Email - Adopt Don't Shop",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
        <div style="background-color: #FF9800; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">⏰ Action Required</h1>
        </div>
        <div style="background-color: white; padding: 40px; margin: 20px 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi {{firstName}},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            We noticed you haven't verified your email address yet. Verification is required to access all features and start your adoption journey.
          </p>
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Your verification link will expire soon!</strong> Click the button below to verify your email now.
            </p>
          </div>
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{verificationUrl}}" style="background-color: #FF9800; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Verify Email Now
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 30px;">
            If the button doesn't work, copy and paste this link:
          </p>
          <p style="font-size: 13px; color: #FF9800; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-family: monospace;">
            {{verificationUrl}}
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 30px;">
            <strong>Need a new verification link?</strong> Visit your account settings to resend the verification email.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
            Thank you,<br>
            <strong>The Adopt Don't Shop Team</strong>
          </p>
        </div>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 5px 0;">
            This is an automated reminder from Adopt Don't Shop.
          </p>
        </div>
      </div>
    `,
    textContent: `
      Action Required: Verify Your Email

      Hi {{firstName}},

      We noticed you haven't verified your email address yet. Verification is required to access all features and start your adoption journey.

      ⚠️ Your verification link will expire soon! Click the link below to verify your email now.

      {{verificationUrl}}

      Need a new verification link? Visit your account settings to resend the verification email.

      Thank you,
      The Adopt Don't Shop Team

      ---
      This is an automated reminder from Adopt Don't Shop.
    `,
    category: TemplateCategory.REMINDER,
    status: TemplateStatus.ACTIVE,
    variables: [],
    metadata: {
      reminderType: 'email_verification',
      priority: 'medium',
    } as Record<string, string | number | boolean>,
    locale: 'en',
    versions: [],
    currentVersion: 1,
    isDefault: false,
    priority: 5,
    tags: ['verification', 'reminder', 'security'],
    usageCount: 0,
    testEmailsSent: 0,
    createdBy: 'user_0000admin01',
    lastModifiedBy: 'user_0000admin01',
  },
];
export async function seedEmailTemplates() {
  for (const template of emailTemplateData) {
    await EmailTemplate.findOrCreate({
      where: { templateId: template.templateId },
      defaults: template,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${emailTemplateData.length} email templates`);
}
