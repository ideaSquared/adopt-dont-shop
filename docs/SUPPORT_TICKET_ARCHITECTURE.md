# Support Ticket System Architecture

## Current Issues

1. **Single route file** with admin-only access
2. **Wrong mount point**: `/api/v1/support` (should be `/api/v1/admin/support`)
3. **No user-facing endpoints** for regular users to create/manage their tickets
4. **Frontend calling wrong path**: `/api/v1/admin/support/tickets` (route mounted at `/api/v1/support`)

## Proposed Architecture

### User-Facing Endpoints (New)
**Mount**: `/api/v1/support`
**Auth**: Any authenticated user
**Purpose**: Users manage their own support tickets

```typescript
// service.backend/src/routes/userSupport.routes.ts
POST   /api/v1/support/tickets                    // Create ticket for self
GET    /api/v1/support/my-tickets                 // List my tickets
GET    /api/v1/support/tickets/:ticketId          // View my ticket (must own it)
POST   /api/v1/support/tickets/:ticketId/reply    // Reply to my ticket
```

**Key Differences from Admin:**
- User can ONLY see/manage their own tickets
- User provides their own userId (from auth token)
- User cannot assign, escalate, or see all tickets

### Admin Endpoints (Existing - Fix Mount)
**Mount**: `/api/v1/admin/support` ← **CHANGE FROM `/api/v1/support`**
**Auth**: ADMIN, STAFF, MODERATOR
**Purpose**: Staff manage ALL support tickets

```typescript
// service.backend/src/routes/supportTicket.routes.ts (existing)
GET    /api/v1/admin/support/tickets              // View ALL tickets (with filters)
POST   /api/v1/admin/support/tickets              // Create ticket on behalf of user
GET    /api/v1/admin/support/tickets/:ticketId    // View any ticket
PATCH  /api/v1/admin/support/tickets/:ticketId    // Update any ticket
POST   /api/v1/admin/support/tickets/:ticketId/assign     // Assign to agent
POST   /api/v1/admin/support/tickets/:ticketId/reply      // Staff reply
POST   /api/v1/admin/support/tickets/:ticketId/escalate   // Escalate
GET    /api/v1/admin/support/stats                // Ticket statistics
GET    /api/v1/admin/support/my-tickets           // Tickets assigned to me
```

**Key Differences from User:**
- Can see ALL tickets (not just own)
- Can create tickets on behalf of users (requires userId, userEmail, userName)
- Can assign, escalate, update status, priority, etc.

## Implementation Plan

### Step 1: Create User Support Routes
```bash
service.backend/src/routes/userSupport.routes.ts
service.backend/src/controllers/userSupport.controller.ts (or reuse existing with filtering)
```

### Step 2: Fix Admin Route Mount Point
```typescript
// service.backend/src/index.ts
// CHANGE:
app.use('/api/v1/support', supportTicketRoutes);
// TO:
app.use('/api/v1/admin/support', supportTicketRoutes);  // Admin routes
app.use('/api/v1/support', userSupportRoutes);         // User routes
```

### Step 3: Update Frontend
```typescript
// For admin creating ticket on behalf of user:
await apiService.post('/api/v1/admin/support/tickets', {
  customerId: user.userId,
  customerEmail: user.email,
  customerName: `${user.firstName} ${user.lastName}`,
  subject,
  description,
  category,
  priority,
});

// For regular user creating their own ticket (future):
await apiService.post('/api/v1/support/tickets', {
  subject,
  description,
  category,
  priority,
  // userId comes from auth token on backend
});
```

## Controller Logic

### UserSupportController (New)
```typescript
static async createTicket(req: AuthenticatedRequest, res: Response) {
  // Get userId from authenticated user
  const userId = req.user!.userId;
  const { subject, description, category, priority } = req.body;

  // Get user details from database
  const user = await User.findByPk(userId);

  const ticket = await SupportTicketService.createTicket({
    userId: user.userId,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    subject,
    description,
    category,
    priority: priority || 'normal',
  });

  return res.status(201).json({ success: true, data: ticket });
}

static async getMyTickets(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const tickets = await SupportTicketService.getUserTickets(userId);
  return res.json({ success: true, data: tickets });
}
```

### SupportTicketController (Existing - Admin)
```typescript
static async createTicket(req: Request, res: Response) {
  // Admin can specify any user
  const { userId, userEmail, userName, subject, description, category, priority } = req.body;

  // Validation: require userId or userEmail
  if (!userId && !userEmail) {
    return res.status(400).json({
      error: 'Must provide userId or userEmail'
    });
  }

  const ticket = await SupportTicketService.createTicket({
    userId,
    userEmail,
    userName,
    subject,
    description,
    category,
    priority: priority || 'normal',
  });

  return res.status(201).json({ success: true, data: ticket });
}
```

## Service Layer (Shared)

The `SupportTicketService` remains the same - both user and admin controllers use it:

```typescript
class SupportTicketService {
  static async createTicket(data) { ... }
  static async getTickets(filters, pagination) { ... }  // Admin only
  static async getUserTickets(userId) { ... }           // User only
  static async getTicketById(ticketId, userId?) { ... } // Check ownership if userId provided
}
```

## Security Considerations

1. **User endpoints**: Must verify ticket ownership
   - When user requests `/api/v1/support/tickets/:ticketId`, verify `ticket.userId === req.user.userId`

2. **Admin endpoints**: No ownership check needed
   - Admins can access any ticket

3. **Shared service methods**: Accept optional `userId` parameter
   - If provided, filter by userId (user mode)
   - If null, return all (admin mode)

## Migration Path

1. ✅ Create `userSupport.routes.ts` and `userSupport.controller.ts`
2. ✅ Update `/api/v1/support` mount to use new user routes
3. ✅ Change admin routes mount to `/api/v1/admin/support`
4. ✅ Update frontend to use `/api/v1/admin/support/tickets` for admin ticket creation
5. ✅ Add `getUserTickets` method to service
6. ✅ Test both user and admin flows

## Benefits

- ✅ **Clear separation**: User vs Admin endpoints
- ✅ **Security**: Users can only see their own tickets
- ✅ **Flexibility**: Different auth requirements
- ✅ **Maintainability**: Single service, two controllers
- ✅ **RESTful**: Proper resource paths
