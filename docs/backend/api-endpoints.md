# API Endpoints Reference

## Overview

The Adopt Don't Shop Backend API provides RESTful endpoints for managing users, pets, applications, messaging, and admin functions. All endpoints return JSON responses and follow REST conventions.

**Base URLs:**

- Development: `http://localhost:4000` (the Fastify gateway, or `http://api.localhost` via the nginx proxy)
- Staging: `https://api-staging.adoptdontshop.com`
- Production: `https://api.adoptdontshop.com`

**Current Version:** `/api/v1/`

## Authentication

### Quick Start

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login` (returns JWT tokens)
3. **Use Token**: Include in Authorization header: `Authorization: Bearer <token>`
4. **Refresh**: `POST /api/v1/auth/refresh-token` (when token expires)

### Auth Endpoints

| Method | Endpoint                              | Description                            | Auth Required       |
| ------ | ------------------------------------- | -------------------------------------- | ------------------- |
| POST   | `/api/v1/auth/register`               | Create new user account                | No                  |
| POST   | `/api/v1/auth/login`                  | Authenticate and get tokens            | No                  |
| POST   | `/api/v1/auth/logout`                 | Invalidate current session             | Yes                 |
| POST   | `/api/v1/auth/refresh-token`          | Refresh access token (refresh token in body) | No (rate-limited)  |
| POST   | `/api/v1/auth/forgot-password`        | Request password reset                 | No                  |
| POST   | `/api/v1/auth/reset-password`         | Reset password with token              | No                  |
| POST   | `/api/v1/auth/verify-email`           | Verify email address (token in body)   | No                  |
| POST   | `/api/v1/auth/resend-verification`    | Resend verification email              | No                  |
| GET    | `/api/v1/auth/me`                     | Get current user profile               | Yes                 |
| PATCH  | `/api/v1/users/account`               | Update current user's account fields   | Yes                 |
| POST   | `/api/v1/auth/2fa/setup`              | Begin two-factor enrolment             | Yes                 |
| POST   | `/api/v1/auth/2fa/enable`             | Enable two-factor (verify OTP)         | Yes                 |
| POST   | `/api/v1/auth/2fa/disable`            | Disable two-factor                     | Yes                 |

## Core Resources

### Users

User listing lives under [Admin Endpoints](#admin-endpoints) (`GET /api/v1/admin/users`); the `/api/v1/users` mount is for the current user's own resources.

| Method | Endpoint                          | Description                                       |
| ------ | --------------------------------- | ------------------------------------------------- |
| GET    | `/api/v1/users/profile`           | Get current user profile                          |
| PUT    | `/api/v1/users/profile`           | Update current user profile                       |
| GET    | `/api/v1/users/preferences`       | Get current user's preferences                    |
| PUT    | `/api/v1/users/preferences`       | Update current user's preferences                 |
| POST   | `/api/v1/users/preferences/reset` | Reset preferences to defaults                     |
| GET    | `/api/v1/users/account`           | Get current user's account record                 |
| PATCH  | `/api/v1/users/account`           | Update current user's account fields              |
| GET    | `/api/v1/users/:userId`           | Get another user's public profile                 |

### Pets

Route params use `:id` (not `:petId`). Image upload lives under [Uploads](#uploads).

| Method | Endpoint                       | Description                                         |
| ------ | ------------------------------ | --------------------------------------------------- |
| GET    | `/api/v1/pets`                 | Search/browse pets (supports filtering, pagination) |
| GET    | `/api/v1/pets/stats`           | Get pet stats (rescue staff)                        |
| GET    | `/api/v1/pets/favorites/user`  | List current user's favorited pets                  |
| GET    | `/api/v1/pets/:id`             | Get pet details                                     |
| POST   | `/api/v1/pets`                 | Create new pet (rescue staff only)                  |
| PATCH  | `/api/v1/pets/:id`             | Update pet information                              |
| DELETE | `/api/v1/pets/:id`             | Delete pet (soft delete)                            |
| POST   | `/api/v1/pets/:id/status`      | Update pet availability status                      |
| POST   | `/api/v1/pets/bulk-update`     | Bulk status/field update                            |
| GET    | `/api/v1/pets/:id/favorite/status` | Whether the current user has favorited this pet |
| POST   | `/api/v1/pets/:id/favorite`    | Add to favorites                                    |
| DELETE | `/api/v1/pets/:id/favorite`    | Remove from favorites                               |

### Discovery (Swipe Interface)

| Method | Endpoint                                       | Description                                |
| ------ | ---------------------------------------------- | ------------------------------------------ |
| POST   | `/api/v1/discovery/queue`                      | Get personalized pet queue for swiping     |
| POST   | `/api/v1/discovery/pets/more`                  | Load more pets for infinite scroll         |
| POST   | `/api/v1/discovery/swipe/action`               | Record swipe action (like/pass/super-like) |
| GET    | `/api/v1/discovery/swipe/stats/:userId`        | Get user swipe analytics                   |
| GET    | `/api/v1/discovery/swipe/session/:sessionId`   | Get session-level swipe metrics            |

### Applications

Route params use `:id` (not `:applicationId`). Draft/review/approval/rejection all have dedicated sub-routes.

| Method | Endpoint                                          | Description                          |
| ------ | ------------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/applications`                            | List applications (filtered by role) |
| POST   | `/api/v1/applications`                            | Create new application               |
| GET    | `/api/v1/applications/stats`                      | Application aggregate stats          |
| GET    | `/api/v1/applications/:id`                        | Get application details              |
| PATCH  | `/api/v1/applications/:id/status`                 | Update application status            |
| PATCH  | `/api/v1/applications/:id/answers`                | Save draft answers                   |
| POST   | `/api/v1/applications/:id/submit`                 | Submit for review                    |
| POST   | `/api/v1/applications/:id/review`                 | Start review (rescue staff)          |
| POST   | `/api/v1/applications/:id/approve`                | Approve                              |
| POST   | `/api/v1/applications/:id/reject`                 | Reject                               |
| POST   | `/api/v1/applications/:id/adopt`                  | Mark adopted                         |
| PUT    | `/api/v1/applications/:id/withdraw`               | Withdraw application                 |
| POST   | `/api/v1/applications/:id/home-visit/schedule`    | Schedule a home visit                |
| POST   | `/api/v1/applications/:id/home-visit/complete`    | Record home visit outcome            |
| POST   | `/api/v1/applications/bulk-update`                | Bulk field update                    |
| GET    | `/api/v1/applications/drafts/:petId`              | Get current user's draft for a pet   |
| PUT    | `/api/v1/applications/drafts/:petId`              | Save/replace draft                   |
| DELETE | `/api/v1/applications/drafts/:petId`              | Delete draft                         |
| GET    | `/api/v1/profile/application-defaults`            | Get user's application defaults      |
| PUT    | `/api/v1/profile/application-defaults`            | Update application defaults          |

### Rescues

| Method | Endpoint                                  | Description                     |
| ------ | ----------------------------------------- | ------------------------------- |
| GET    | `/api/v1/rescues`                         | List rescue organizations       |
| POST   | `/api/v1/rescues`                         | Register new rescue             |
| GET    | `/api/v1/rescues/:rescueId`               | Get rescue profile              |
| PUT    | `/api/v1/rescues/:rescueId`               | Update rescue information       |
| GET    | `/api/v1/rescues/:rescueId/staff`         | Get rescue staff                |
| POST   | `/api/v1/rescues/:rescueId/staff`         | Add staff member                |
| DELETE | `/api/v1/rescues/:rescueId/staff/:userId` | Remove staff member             |
| GET    | `/api/v1/rescues/:rescueId/pets`          | Get rescue's pets               |
| GET    | `/api/v1/rescues/:rescueId/analytics`     | Get rescue metrics (staff only) |

### Chat & Messaging

Chat routes are mounted at `/api/v1/chats` (canonical). `/api/v1/conversations` is registered as an alias for backwards compatibility — prefer `chats` in new code. The schema field is `chat_id`.

| Method | Endpoint                                            | Description                            |
| ------ | --------------------------------------------------- | -------------------------------------- |
| GET    | `/api/v1/chats`                                     | List user's chats                      |
| POST   | `/api/v1/chats`                                     | Create new chat                        |
| GET    | `/api/v1/chats/search`                              | Search chats                           |
| GET    | `/api/v1/chats/unread-count`                        | Total unread across all chats          |
| GET    | `/api/v1/chats/:chatId`                             | Get chat details                       |
| DELETE | `/api/v1/chats/:chatId`                             | Archive/delete chat                    |
| GET    | `/api/v1/chats/:chatId/messages`                    | Get messages (paginated)               |
| POST   | `/api/v1/chats/:chatId/messages`                    | Send message                           |
| DELETE | `/api/v1/chats/:chatId/messages/:messageId`         | Delete message                         |
| POST   | `/api/v1/chats/:chatId/read`                        | Mark messages as read                  |
| POST   | `/api/v1/messages/:messageId/reactions`             | Add / remove reaction to a message     |

### Notifications

| Method | Endpoint                                     | Description                        |
| ------ | -------------------------------------------- | ---------------------------------- |
| GET    | `/api/v1/notifications`                      | Get user notifications (paginated) |
| PATCH  | `/api/v1/notifications/:notificationId/read` | Mark as read                       |
| DELETE | `/api/v1/notifications/:notificationId`      | Delete notification                |
| GET    | `/api/v1/notifications/unread/count`         | Get unread count                   |
| POST   | `/api/v1/notifications/read-all`             | Mark all as read                   |
| GET    | `/api/v1/notifications/preferences`          | Get notification preferences       |
| PUT    | `/api/v1/notifications/preferences`          | Update preferences                 |

## Admin Endpoints

Mounted at `/api/v1/admin`. Moderation routes live under the separate `/api/v1/admin/moderation` mount.

| Method | Endpoint                                             | Description                                                            |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/v1/admin/users`                                | List all users (with filtering)                                        |
| POST   | `/api/v1/admin/users`                                | Create a user                                                          |
| PATCH  | `/api/v1/admin/users/:userId`                        | Update a user record                                                   |
| POST   | `/api/v1/admin/users/:userId/action`                 | Perform an admin action (suspend, restore, force-logout, etc.)         |
| POST   | `/api/v1/admin/users/:userId/reset-password`         | Admin-triggered password reset                                         |
| POST   | `/api/v1/rescues/:rescueId/verify`                   | Approve rescue verification                                            |
| POST   | `/api/v1/rescues/:rescueId/reject`                   | Reject rescue verification                                             |
| PATCH  | `/api/v1/admin/rescues/:rescueId/plan`               | Change rescue subscription plan                                        |
| GET    | `/api/v1/admin/moderation/reports`                   | Get content reports                                                    |
| PATCH  | `/api/v1/admin/moderation/reports/:id/status`        | Update report status                                                   |
| POST   | `/api/v1/admin/moderation/actions`                   | Take moderation action                                                 |
| GET    | `/api/v1/admin/metrics`                              | Admin dashboard metrics                                                |
| GET    | `/api/v1/admin/analytics/dashboard`                  | Admin dashboard analytics                                              |

## Common Patterns

### Pagination

Query parameters for list endpoints:

```
?page=1&limit=20&sort=createdAt&order=desc
```

Response format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Filtering

Use query parameters:

```
GET /api/v1/pets?type=DOG&age=1-3&location=London
```

### Error Responses

Standard error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

Common HTTP status codes:

- `200` OK
- `201` Created
- `400` Bad Request (validation error)
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (insufficient permissions)
- `404` Not Found
- `500` Internal Server Error

## Interactive API Documentation

**Swagger UI**: Available at `/docs` (e.g. http://localhost:4000/docs in dev). The OpenAPI JSON is served at `/openapi.json`.

- Full endpoint documentation with request/response schemas
- Interactive testing interface
- Authentication token management
- Generated OpenAPI specs are also committed at `docs/backend/generated-openapi.json` / `.yaml`

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user
- **Admin**: 5000 requests per 15 minutes

Rate limit headers included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## WebSocket Events (Real-time)

Connect to `/socket.io` with JWT authentication.

**Events:**

- `message:new` - New chat message received
- `message:read` - Message read status updated
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `notification:new` - New notification received
- `application:updated` - Application status changed

## Additional Resources

- **Implementation Guide**: [implementation-guide.md](./implementation-guide.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Deployment Guide**: [deployment.md](./deployment.md)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
