# API Endpoints Reference

## Overview

The Adopt Don't Shop Backend API provides RESTful endpoints for managing users, pets, applications, messaging, and admin functions. All endpoints return JSON responses and follow REST conventions.

**Base URLs:**
- Development: `http://localhost:5000`
- Staging: `https://api-staging.adoptdontshop.com`
- Production: `https://api.adoptdontshop.com`

**Current Version:** `/api/v1/`

## Authentication

### Quick Start

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login` (returns JWT tokens)
3. **Use Token**: Include in Authorization header: `Authorization: Bearer <token>`
4. **Refresh**: `POST /api/v1/auth/refresh` (when token expires)

### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Create new user account | No |
| POST | `/api/v1/auth/login` | Authenticate and get tokens | No |
| POST | `/api/v1/auth/logout` | Invalidate current session | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | Yes (refresh token) |
| POST | `/api/v1/auth/password/forgot` | Request password reset | No |
| POST | `/api/v1/auth/password/reset` | Reset password with token | No |
| POST | `/api/v1/auth/email/verify` | Verify email address | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |

## Core Resources

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (admin only, with pagination) |
| GET | `/api/v1/users/:userId` | Get user details |
| PUT | `/api/v1/users/:userId` | Update user profile |
| DELETE | `/api/v1/users/:userId` | Delete user account (soft delete) |
| GET | `/api/v1/users/:userId/preferences` | Get user preferences |
| PUT | `/api/v1/users/:userId/preferences` | Update preferences |

### Pets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pets` | Search/browse pets (supports filtering, pagination) |
| POST | `/api/v1/pets` | Create new pet (rescue staff only) |
| GET | `/api/v1/pets/:petId` | Get pet details |
| PUT | `/api/v1/pets/:petId` | Update pet information |
| DELETE | `/api/v1/pets/:petId` | Delete pet (soft delete) |
| POST | `/api/v1/pets/:petId/images` | Upload pet images |
| DELETE | `/api/v1/pets/:petId/images/:imageId` | Delete specific image |
| POST | `/api/v1/pets/:petId/favorite` | Add to favorites |
| DELETE | `/api/v1/pets/:petId/favorite` | Remove from favorites |

### Discovery (Swipe Interface)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/discovery/pets` | Get personalized pet queue for swiping |
| POST | `/api/v1/discovery/swipe/action` | Record swipe action (like/pass/super-like) |
| GET | `/api/v1/discovery/swipe/stats/:userId` | Get user swipe analytics |
| POST | `/api/v1/discovery/pets/more` | Load more pets for infinite scroll |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/applications` | List applications (filtered by role) |
| POST | `/api/v1/applications` | Submit new application |
| GET | `/api/v1/applications/:applicationId` | Get application details |
| PATCH | `/api/v1/applications/:applicationId/status` | Update application status |
| DELETE | `/api/v1/applications/:applicationId` | Withdraw application |
| GET | `/api/v1/applications/:applicationId/history` | Get status history |

### Rescues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rescues` | List rescue organizations |
| POST | `/api/v1/rescues` | Register new rescue |
| GET | `/api/v1/rescues/:rescueId` | Get rescue profile |
| PUT | `/api/v1/rescues/:rescueId` | Update rescue information |
| GET | `/api/v1/rescues/:rescueId/staff` | Get rescue staff |
| POST | `/api/v1/rescues/:rescueId/staff` | Add staff member |
| DELETE | `/api/v1/rescues/:rescueId/staff/:userId` | Remove staff member |
| GET | `/api/v1/rescues/:rescueId/pets` | Get rescue's pets |
| GET | `/api/v1/rescues/:rescueId/analytics` | Get rescue metrics (staff only) |

### Conversations & Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List user's conversations |
| POST | `/api/v1/conversations` | Create new conversation |
| GET | `/api/v1/conversations/:conversationId` | Get conversation details |
| GET | `/api/v1/conversations/:conversationId/messages` | Get messages (paginated) |
| POST | `/api/v1/conversations/:conversationId/messages` | Send message |
| PUT | `/api/v1/conversations/:conversationId/messages/:messageId` | Edit message |
| DELETE | `/api/v1/conversations/:conversationId/messages/:messageId` | Delete message |
| POST | `/api/v1/conversations/:conversationId/read` | Mark messages as read |
| POST | `/api/v1/conversations/:conversationId/participants` | Add participant |
| GET | `/api/v1/conversations/:conversationId/search` | Search messages |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | Get user notifications (paginated) |
| PATCH | `/api/v1/notifications/:notificationId/read` | Mark as read |
| DELETE | `/api/v1/notifications/:notificationId` | Delete notification |
| GET | `/api/v1/notifications/unread/count` | Get unread count |
| POST | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/notifications/preferences` | Get notification preferences |
| PUT | `/api/v1/notifications/preferences` | Update preferences |

## Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List all users (with filtering) |
| PATCH | `/api/v1/admin/users/:userId/status` | Update user status |
| POST | `/api/v1/admin/users/:userId/suspend` | Suspend user |
| GET | `/api/v1/admin/rescues` | List all rescues |
| POST | `/api/v1/admin/rescues/:rescueId/verify` | Verify rescue organization |
| GET | `/api/v1/admin/moderation/reports` | Get content reports |
| POST | `/api/v1/admin/moderation/reports/:reportId/actions` | Take moderation action |
| GET | `/api/v1/admin/system/health` | System health status |
| GET | `/api/v1/admin/analytics/dashboard` | Admin dashboard analytics |

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

**Swagger UI**: Available at `/api-docs` in development mode
- Full endpoint documentation with request/response schemas
- Interactive testing interface
- Authentication token management
- Real-time API exploration

**Postman Collection**: Import from `/api/postman-collection.json`

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

- **Backend Architecture**: [architecture.md](./architecture.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Authentication Guide**: [authentication.md](./authentication.md)
- **Deployment Guide**: [deployment.md](./deployment.md)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
