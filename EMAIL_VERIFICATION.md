# Email Verification Flow Documentation

## Overview

This document describes the complete email verification system implemented for new user registrations in the Adopt Don't Shop platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [User Registration Flow](#user-registration-flow)
3. [Email Verification Process](#email-verification-process)
4. [Resend Verification Email](#resend-verification-email)
5. [Verification Reminders](#verification-reminders)
6. [Security Features](#security-features)
7. [Frontend Implementation](#frontend-implementation)
8. [Backend Implementation](#backend-implementation)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The email verification system consists of the following components:

### Backend Components
- **AuthService** (`service.backend/src/services/auth.service.ts`): Core authentication logic
- **Email Templates** (`service.backend/src/seeders/14-email-templates.ts`): HTML email templates
- **EmailService** (`service.backend/src/services/email.service.ts`): Email sending infrastructure
- **Auth Middleware** (`service.backend/src/middleware/auth.ts`): Email verification enforcement
- **User Model** (`service.backend/src/models/User.ts`): User data with verification fields

### Frontend Components
- **VerifyEmailPage** (`app.client/src/pages/VerifyEmailPage.tsx`): Email verification UI
- **AuthService** (`lib.auth/src/services/auth-service.ts`): Client-side auth API calls

### Database Fields
User model includes:
- `emailVerified`: boolean - Whether email is verified
- `verificationToken`: string - Secure random token for verification
- `verificationTokenExpiresAt`: Date - Token expiration (24 hours)
- `status`: enum - User account status (PENDING_VERIFICATION → ACTIVE)

---

## User Registration Flow

### Step-by-Step Process

1. **User Submits Registration Form**
   - User provides: email, password, first name, last name, user type
   - Form validation occurs on client-side before submission

2. **Backend Creates User Account**
   ```typescript
   // service.backend/src/services/auth.service.ts:26-105
   const verificationToken = crypto.randomBytes(32).toString('hex');
   const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

   const user = await User.create({
     email: userData.email.toLowerCase(),
     password: userData.password, // Auto-hashed by model hook
     status: UserStatus.PENDING_VERIFICATION,
     emailVerified: false,
     verificationToken,
     verificationTokenExpiresAt: verificationExpires,
   });
   ```

3. **Verification Email is Sent**
   ```typescript
   const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

   await emailService.sendEmail({
     toEmail: user.email,
     templateData: {
       firstName: user.firstName,
       verificationToken,
       verificationUrl,
       expiresAt: verificationExpires.toISOString(),
     },
     type: 'transactional',
     priority: 'high',
     subject: 'Verify Your Email Address - Adopt Don\'t Shop',
   });
   ```

4. **User Receives Tokens**
   - JWT access token (15 minutes expiry)
   - JWT refresh token (7 days expiry)
   - User can authenticate but has limited access until email is verified

---

## Email Verification Process

### Email Template

Two email templates are available:

#### 1. Initial Verification Email
- **Template ID**: `template_0000ever01`
- **Subject**: "Verify Your Email Address - Adopt Don't Shop"
- **Priority**: High
- **Expiration**: 24 hours

Key features:
- Clear call-to-action button
- Fallback plain-text link
- Expiration warning
- Security disclaimer ("Didn't create an account?")
- Benefits list (what users can do after verification)

#### 2. Verification Reminder Email
- **Template ID**: `template_0000evrem01`
- **Subject**: "Reminder: Verify Your Email - Adopt Don't Shop"
- **Priority**: Medium
- **Triggered**: 12-72 hours after registration

### Verification Endpoint

**Endpoint**: `GET /api/v1/auth/verify-email/:token`

**Process**:
1. Validates token exists and matches user
2. Checks token hasn't expired
3. Updates user record:
   ```typescript
   user.emailVerified = true;
   user.verificationToken = null;
   user.verificationTokenExpiresAt = null;
   user.status = UserStatus.ACTIVE;
   ```
4. Creates audit log entry
5. Returns success response

**Success Response**: `200 OK`

**Error Responses**:
- `400 Bad Request`: Invalid token format
- `404 Not Found`: Token not found or already used
- `410 Gone`: Token expired

---

## Resend Verification Email

### Endpoint

**Endpoint**: `POST /api/v1/auth/resend-verification`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### Security Features

1. **No Information Disclosure**
   - Always returns same success message
   - Doesn't reveal if email exists or is already verified
   - Prevents email enumeration attacks

2. **Response**:
   ```json
   {
     "message": "If the email exists and is unverified, a new verification link has been sent"
   }
   ```

### Process

1. Find user by email (case-insensitive)
2. Check if user exists and is unverified
3. Generate new verification token
4. Update token and expiry in database
5. Send new verification email
6. Create audit log entry

**Implementation**: `service.backend/src/services/auth.service.ts:544-628`

---

## Verification Reminders

### Automated Reminder System

The system includes an automated reminder service that can be scheduled via cron job or manually triggered.

**Method**: `AuthService.sendVerificationReminders(hoursOld, maxHoursOld)`

**Default Parameters**:
- `hoursOld`: 12 hours (send to users who registered 12+ hours ago)
- `maxHoursOld`: 72 hours (don't send to users older than 72 hours)

### Selection Criteria

Users receive reminders if they:
1. ✅ Have `emailVerified = false`
2. ✅ Have `status = PENDING_VERIFICATION`
3. ✅ Have a non-null `verificationToken`
4. ✅ Token hasn't expired yet
5. ✅ Registered between 12-72 hours ago

### Implementation

```typescript
// Example: Send reminders via cron job
// This could be added to a scheduler service
import { AuthService } from './services/auth.service';

// Run daily at 10 AM
async function sendDailyReminders() {
  const result = await AuthService.sendVerificationReminders(12, 72);
  console.log(`Sent ${result.sent} reminders, ${result.failed} failed`);
}
```

**Implementation**: `service.backend/src/services/auth.service.ts:839-937`

---

## Security Features

### Token Generation

```typescript
crypto.randomBytes(32).toString('hex')
```
- 32 bytes = 64 character hex string
- Cryptographically secure randomness
- Virtually impossible to guess or brute-force

### Token Expiration

- **Duration**: 24 hours from generation
- **Automatic cleanup**: Expired tokens are rejected
- **One-time use**: Token is cleared after successful verification

### Login Protection

Users cannot log in until email is verified:

```typescript
// service.backend/src/services/auth.service.ts:162-164
if (!user.emailVerified) {
  throw new Error('Please verify your email before logging in');
}
```

### Route Protection Middleware

Additional middleware available for protecting specific routes:

```typescript
import { requireEmailVerification } from '../middleware/auth';

// Apply to routes that require verified email
router.get(
  '/api/v1/applications',
  authenticateToken,
  requireEmailVerification,
  getApplications
);
```

**Implementation**: `service.backend/src/middleware/auth.ts:311-368`

### Account Status Management

- New users: `status = PENDING_VERIFICATION`
- After verification: `status = ACTIVE`
- Only ACTIVE users can fully access the platform

---

## Frontend Implementation

### Verify Email Page

**Location**: `app.client/src/pages/VerifyEmailPage.tsx`

**Features**:

1. **Automatic Verification**
   - Extracts token from URL query parameter
   - Automatically calls verification API on page load
   - Shows loading state during verification

2. **Status Handling**
   - ✅ Success: Shows success message, auto-redirects to login
   - ❌ Error: Shows error message with resend option
   - ⏰ Expired: Shows expiration message with resend option
   - ⏳ Verifying: Shows loading spinner

3. **User Actions**
   - Resend verification email
   - Return to login
   - Contact support (on error)

### URL Structure

```
https://example.com/verify-email?token=a1b2c3d4e5f6...
```

### User Experience Flow

```
User clicks email link
    ↓
Lands on /verify-email page
    ↓
Auto-verifies token
    ↓
┌─────────────────────────────────┐
│ Success? │ Expired? │ Error?    │
└─────────────────────────────────┘
      ↓           ↓         ↓
  Success     Resend     Resend/Support
  Message     Button     Options
      ↓
Auto-redirect to login (3 seconds)
```

---

## Backend Implementation

### Key Files Modified/Created

1. **Auth Service** (`service.backend/src/services/auth.service.ts`)
   - Line 86-109: Send verification email during registration
   - Line 544-628: Resend verification email
   - Line 839-937: Send verification reminders

2. **Auth Middleware** (`service.backend/src/middleware/auth.ts`)
   - Line 311-368: `requireEmailVerification` middleware

3. **Email Templates** (`service.backend/src/seeders/14-email-templates.ts`)
   - Line 470-582: Email Verification template
   - Line 583-665: Email Verification Reminder template

4. **Auth Routes** (`service.backend/src/routes/auth.routes.ts`)
   - Already includes verification endpoints

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/auth/verify-email/:token` | Verify email with token | No |
| POST | `/api/v1/auth/resend-verification` | Resend verification email | No |

---

## Testing

### Behavior Tests

Comprehensive test suite added to `service.backend/src/__tests__/services/auth.service.test.ts`:

**Test Coverage**:

1. **Email Verification (verifyEmail)**
   - ✅ Should verify email successfully with valid token
   - ✅ Should throw error for invalid token
   - ✅ Should throw error for expired verification token
   - ✅ Should handle already verified email gracefully
   - ✅ Should create audit log entry on successful verification

2. **Resend Verification Email**
   - ✅ Should generate new token and send verification email
   - ✅ Should not reveal if email does not exist
   - ✅ Should not reveal if email is already verified
   - ✅ Should create audit log entry when resending

3. **Login Email Verification Enforcement**
   - ✅ Should block login for users with unverified email
   - ✅ Should allow login for users with verified email

4. **Registration Email Sending**
   - ✅ Should send verification email after successful registration
   - ✅ Should set verification token expiry to 24 hours

### Running Tests

```bash
# Run all backend tests
npm run test:backend

# Run specific auth service tests
npm run test:backend -- auth.service.test.ts
```

---

## Troubleshooting

### Common Issues

#### 1. User Didn't Receive Email

**Possible Causes**:
- Email in spam folder
- Email service configuration issue
- Invalid email address

**Solutions**:
- Check spam/junk folders
- Use resend verification feature
- Check EmailQueue model for failed sends
- Verify email provider configuration

**Debug**:
```typescript
// Check email queue status
const emailQueue = await EmailQueue.findAll({
  where: { toEmail: 'user@example.com' },
  order: [['createdAt', 'DESC']],
  limit: 5
});
```

#### 2. Verification Link Expired

**Solution**: Use "Resend Verification Email" feature

**Prevention**:
- Send reminder emails after 12 hours
- Clearly communicate 24-hour expiration in emails

#### 3. Token Already Used

**Cause**: User clicked verification link twice

**Solution**: Show appropriate message that email is already verified

#### 4. Cannot Login After Registration

**Cause**: Email not verified yet

**Solution**:
- Check email for verification link
- Use "Resend Verification Email" on login page
- Status message should clearly indicate email verification is required

### Monitoring

**Audit Logs to Monitor**:
- `USER_CREATED`: New registrations
- `EMAIL_VERIFIED`: Successful verifications
- `VERIFICATION_EMAIL_RESEND`: Resend requests
- `VERIFICATION_REMINDER_SENT`: Automated reminders

**Query Example**:
```sql
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE action IN ('USER_CREATED', 'EMAIL_VERIFIED', 'VERIFICATION_EMAIL_RESEND')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action;
```

---

## Environment Variables

Required environment variables:

```env
# Frontend URL for verification links
FRONTEND_URL=https://adoptdontshop.com

# JWT Configuration (already configured)
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Provider Configuration (already configured)
# See EmailService for provider-specific settings
```

---

## Future Enhancements

Potential improvements to consider:

1. **Scheduled Reminder Job**
   - Add cron job to automatically send reminders
   - Suggested timing: Daily at 10 AM

2. **Email Verification Badge**
   - Show verification status in user profile
   - Display badge for verified users

3. **Multi-step Verification**
   - Add SMS verification option
   - Implement backup verification methods

4. **Analytics Dashboard**
   - Track verification completion rates
   - Monitor time-to-verification metrics
   - Identify drop-off points

5. **Customizable Email Templates**
   - Allow admin to customize email content
   - A/B test different email variations
   - Localization support for multiple languages

6. **Grace Period**
   - Allow limited access before verification
   - Implement soft-block vs hard-block strategies

---

## Summary

The email verification system provides:

✅ **Security**: Secure tokens, expiration, one-time use
✅ **User Experience**: Clear UI, automatic verification, helpful error messages
✅ **Reliability**: Resend functionality, automated reminders
✅ **Monitoring**: Comprehensive audit logging
✅ **Testing**: Full behavior test coverage
✅ **Documentation**: Clear documentation for developers

The system follows industry best practices for email verification and provides a seamless experience for new users while maintaining security standards.
