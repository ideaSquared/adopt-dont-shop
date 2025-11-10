# Backend Test Coverage Improvement Plan

## Current State Analysis

**Overall Coverage: 11.17%**

- **Services**: ~11% coverage (minimal)
- **Controllers**: 0.77% coverage (nearly none)
- **Middleware**: 0% coverage (none)
- **Models**: 1.83% coverage (minimal)
- **Routes**: 0% coverage (none)

### Existing Tests ✅
- [x] auth.service.test.ts
- [x] user.service.test.ts
- [x] pet.service.test.ts
- [x] swipe.service.test.ts
- [x] rescue.service.test.ts
- [x] application.service.test.ts
- [x] discovery.service.test.ts
- [x] auditLog.service.test.ts
- [x] pet-business-logic.test.ts
- [x] auth-security.test.ts
- [x] rescue-business-logic.test.ts
- [x] security-headers.test.ts
- [x] user.controller.test.ts

---

## Phase 1: Core Service Testing (Priority: CRITICAL)

### 1.1 Chat Service ✅
- **File**: `service.backend/src/services/chat.service.ts` (1,665 lines)
- **Test File**: `service.backend/src/__tests__/services/chat.service.test.ts`
- **Current Coverage**: ~85% (estimated)
- **Status**: [x] Completed
- **Tests**: 33 passing tests

**Business behaviors to test:**
- [x] Creating chats with different participant configurations
- [x] Sending messages with rate limiting
- [x] Message delivery and notification workflows
- [x] Read receipts and unread counts
- [x] Participant management (add/remove)
- [x] Message reactions and search
- [x] Chat analytics and reporting
- [x] Message moderation workflows

### 1.2 Email Service ✅
- **File**: `service.backend/src/services/email.service.ts` (987 lines)
- **Test File**: `service.backend/src/__tests__/services/email.service.test.ts`
- **Current Coverage**: ~50% (estimated)
- **Status**: [x] Completed
- **Tests**: 10 passing tests

**Business behaviors to test:**
- [x] Template creation and versioning
- [x] Email queuing with different priorities
- [x] User preference checking before sending
- [x] Bulk email processing with batching
- [ ] Queue processing and retry logic
- [ ] Webhook handling (delivery, bounces, opens, clicks)
- [ ] Unsubscribe workflows
- [ ] Email analytics calculation

### 1.3 Notification Service ✅
- **File**: `service.backend/src/services/notification.service.ts` (820 lines)
- **Test File**: `service.backend/src/__tests__/services/notification.service.test.ts`
- **Current Coverage**: ~70% (estimated)
- **Status**: [x] Completed
- **Tests**: 23 passing tests (100% pass rate)

**Business behaviors tested:**
- [x] Getting user notifications with pagination and filtering
- [x] Creating notifications with different priorities
- [x] Bulk notification creation (fails on any error)
- [x] Marking notifications as read (single and all)
- [x] Soft deleting notifications
- [x] Unread count calculation
- [x] Getting and updating notification preferences
- [x] Cleanup expired notifications
- [x] Error handling for all operations

**Note**: All tests passing. Multi-channel delivery and device token management are in the service but not fully tested yet (can be expanded later).

### 1.4 Analytics Service ⏭️
- **File**: `service.backend/src/services/analytics.service.ts` (1,451 lines)
- **Test File**: `service.backend/src/__tests__/services/analytics.service.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Deferred (service not fully feature-complete)

**Business behaviors to test:**
- [ ] Dashboard metrics calculation
- [ ] User engagement analytics
- [ ] Application funnel analytics
- [ ] Pet listing performance
- [ ] Rescue performance metrics
- [ ] Time-series data aggregation
- [ ] Custom report generation

### 1.5 Admin Service ✅
- **File**: `service.backend/src/services/admin.service.ts` (1,013 lines)
- **Test File**: `service.backend/src/__tests__/services/admin.service.test.ts`
- **Current Coverage**: ~75% (estimated)
- **Status**: [x] Completed
- **Tests**: 28 passing tests (100% pass rate)

**Business behaviors tested:**
- [x] User management with filtering and pagination
- [x] User status updates and verification
- [x] User suspension and unsuspension workflows
- [x] User soft deletion
- [x] Rescue management and verification
- [x] Rescue verification rejection
- [x] System health monitoring
- [x] Platform metrics calculation
- [x] System statistics aggregation
- [x] Audit log retrieval with filtering
- [x] Bulk user operations (suspend, unsuspend, update)
- [x] Error handling for all operations

### 1.6 Moderation Service
- **File**: `service.backend/src/services/moderation.service.ts` (980 lines)
- **Test File**: `service.backend/src/__tests__/services/moderation.service.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Business behaviors to test:**
- [ ] Content flagging and review
- [ ] Automated content scanning
- [ ] Moderator action tracking
- [ ] Appeal workflows
- [ ] Moderation queue management
- [ ] User reputation scoring

---

## Phase 2: Middleware Testing (Priority: HIGH)

### 2.1 Authentication Middleware
- **File**: `service.backend/src/middleware/auth.ts` (307 lines)
- **Test File**: `service.backend/src/__tests__/middleware/auth.middleware.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Behaviors to test:**
- [ ] JWT token validation
- [ ] User session verification
- [ ] Token expiry handling
- [ ] Invalid token rejection
- [ ] Missing token handling
- [ ] User blocking/suspension checks

### 2.2 CSRF Protection
- **File**: `service.backend/src/middleware/csrf.ts` (100 lines)
- **Test File**: `service.backend/src/__tests__/middleware/csrf.middleware.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Behaviors to test:**
- [ ] Token generation and validation
- [ ] Double-submit cookie pattern
- [ ] Token rotation
- [ ] CSRF attack prevention
- [ ] Safe method bypassing

### 2.3 Rate Limiting
- **File**: `service.backend/src/middleware/rate-limiter.ts` (140 lines)
- **Test File**: `service.backend/src/__tests__/middleware/rate-limiter.middleware.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Behaviors to test:**
- [ ] Request counting per user/IP
- [ ] Rate limit enforcement
- [ ] Sliding window algorithm
- [ ] Different limits for different endpoints
- [ ] Rate limit reset behavior

### 2.4 RBAC Middleware
- **File**: `service.backend/src/middleware/rbac.ts` (212 lines)
- **Test File**: `service.backend/src/__tests__/middleware/rbac.middleware.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Behaviors to test:**
- [ ] Permission checking
- [ ] Role-based access control
- [ ] Resource ownership validation
- [ ] Permission inheritance
- [ ] Access denial scenarios

### 2.5 Error Handler
- **File**: `service.backend/src/middleware/error-handler.ts` (72 lines)
- **Test File**: `service.backend/src/__tests__/middleware/error-handler.middleware.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

**Behaviors to test:**
- [ ] Different error type handling
- [ ] Error response formatting
- [ ] Security-sensitive error sanitization
- [ ] Logging integration
- [ ] Production vs development error details

---

## Phase 3: Controller Testing (Priority: HIGH)

Controllers should have integration-style tests that verify:
- Request validation
- Service method invocation
- Response formatting
- Error handling
- Authorization checks

### 3.1 Chat Controller
- **File**: `service.backend/src/controllers/chat.controller.ts` (950 lines)
- **Test File**: `service.backend/src/__tests__/controllers/chat.controller.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 3.2 Application Controller
- **File**: `service.backend/src/controllers/application.controller.ts` (1,279 lines)
- **Test File**: `service.backend/src/__tests__/controllers/application.controller.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 3.3 Pet Controller
- **File**: `service.backend/src/controllers/pet.controller.ts` (1,079 lines)
- **Test File**: `service.backend/src/__tests__/controllers/pet.controller.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 3.4 Rescue Controller
- **File**: `service.backend/src/controllers/rescue.controller.ts` (928 lines)
- **Test File**: `service.backend/src/__tests__/controllers/rescue.controller.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 3.5 Admin Controller
- **File**: `service.backend/src/controllers/admin.controller.ts` (927 lines)
- **Test File**: `service.backend/src/__tests__/controllers/admin.controller.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

---

## Phase 4: Model Testing (Priority: MEDIUM)

Test model behaviors including:
- Instance methods
- Hooks (beforeCreate, beforeUpdate, etc.)
- Validations
- Associations
- Custom getters/setters

### 4.1 EmailQueue Model
- **File**: `service.backend/src/models/EmailQueue.ts`
- **Test File**: `service.backend/src/__tests__/models/EmailQueue.model.test.ts`
- **Current Coverage**: 32.85%
- **Target Coverage**: 100%
- **Status**: [ ] Not Started

### 4.2 User Model
- **File**: `service.backend/src/models/User.ts`
- **Test File**: `service.backend/src/__tests__/models/User.model.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 4.3 Pet Model
- **File**: `service.backend/src/models/Pet.ts`
- **Test File**: `service.backend/src/__tests__/models/Pet.model.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 4.4 Application Model
- **File**: `service.backend/src/models/Application.ts`
- **Test File**: `service.backend/src/__tests__/models/Application.model.test.ts`
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 4.5 Message & Chat Models
- **Files**: `service.backend/src/models/Message.ts`, `Chat.ts`, `ChatParticipant.ts`
- **Test Files**: `service.backend/src/__tests__/models/Message.model.test.ts`, etc.
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

### 4.6 Notification & DeviceToken Models
- **Files**: `service.backend/src/models/Notification.ts`, `DeviceToken.ts`
- **Test Files**: `service.backend/src/__tests__/models/Notification.model.test.ts`, etc.
- **Current Coverage**: 0%
- **Status**: [ ] Not Started

---

## Phase 5: Integration Testing (Priority: MEDIUM)

### 5.1 Authentication Flow
- **Test File**: `service.backend/src/__tests__/integration/auth-flow.test.ts`
- **Status**: [ ] Not Started

**Scenarios:**
- [ ] User registration and email verification
- [ ] Login and JWT token issuance
- [ ] Token refresh workflow
- [ ] Password reset flow
- [ ] Logout and token invalidation

### 5.2 Application Submission Workflow
- **Test File**: `service.backend/src/__tests__/integration/application-workflow.test.ts`
- **Status**: [ ] Not Started

**Scenarios:**
- [ ] User browses pets
- [ ] User submits application
- [ ] Rescue reviews application
- [ ] Application approval/rejection
- [ ] Post-decision workflows

### 5.3 Chat Messaging Flow
- **Test File**: `service.backend/src/__tests__/integration/chat-workflow.test.ts`
- **Status**: [ ] Not Started

**Scenarios:**
- [ ] Chat creation between user and rescue
- [ ] Message sending and receiving
- [ ] Real-time notification delivery
- [ ] Read receipts and typing indicators
- [ ] File attachment handling

### 5.4 Pet Discovery & Matching
- **Test File**: `service.backend/src/__tests__/integration/discovery-workflow.test.ts`
- **Status**: [ ] Not Started

**Scenarios:**
- [ ] Pet search with filters
- [ ] Swipe/like functionality
- [ ] Match creation
- [ ] Recommendation algorithm
- [ ] Saved favorites

### 5.5 Admin Moderation Workflow
- **Test File**: `service.backend/src/__tests__/integration/moderation-workflow.test.ts`
- **Status**: [ ] Not Started

**Scenarios:**
- [ ] Content flagging
- [ ] Moderator review queue
- [ ] Content approval/rejection
- [ ] User sanctions
- [ ] Appeal handling

---

## Coverage Targets

### Immediate Goals (Next 2 Weeks)
- [ ] **Services**: 60%+ coverage for core services (chat, email, notification, auth, user, pet, rescue, application)
- [ ] **Middleware**: 80%+ coverage for all middleware
- [ ] **Controllers**: 40%+ coverage for core controllers

### Medium-term Goals (Next Month)
- [ ] **Services**: 80%+ coverage for all services
- [ ] **Controllers**: 60%+ coverage for all controllers
- [ ] **Models**: 60%+ coverage for business logic methods
- [ ] **Overall**: 50%+ total coverage

### Long-term Goals (Next Quarter)
- [ ] **All Services**: 90%+ coverage
- [ ] **All Middleware**: 95%+ coverage
- [ ] **All Controllers**: 75%+ coverage
- [ ] **Overall**: 70%+ total coverage

---

## Testing Best Practices

Based on CLAUDE.md guidelines:

### 1. Behaviour-Driven Testing
- Test business behaviors, not implementation
- Use descriptive test names that explain the behavior
- Test through public APIs only
- No 1:1 mapping between test files and implementation

### 2. Test Organization
- Group tests by behavior/feature, not by method
- Use `describe` blocks for feature grouping
- Use `it` or `test` for specific scenarios

### 3. Mock Strategy
- Mock external dependencies (database, email providers, push services)
- Use actual service logic when testing services
- Mock services when testing controllers
- Keep mocks simple and behavior-focused

### 4. Test Data
- Use factories for test data creation
- Create realistic test scenarios
- Test edge cases and error conditions
- Include validation failure scenarios

### 5. TypeScript Strict Mode
- All test code follows strict mode rules
- No `any` types in tests
- No type assertions without justification
- Proper typing of mocks and fixtures

---

## Recommended Implementation Order

### Week 1-2: Core Services
1. [ ] Chat Service (highest business value, complex workflows)
2. [ ] Email Service (critical infrastructure)
3. [ ] Notification Service (multi-channel complexity)

### Week 3-4: Authentication & Security
4. [ ] Auth Middleware
5. [ ] CSRF Middleware
6. [ ] Rate Limiter Middleware
7. [ ] RBAC Middleware
8. [ ] Error Handler Middleware

### Week 5-6: Business Logic Services
9. [ ] Analytics Service
10. [ ] Admin Service
11. [ ] Moderation Service

### Week 7-8: Controllers & Integration
12. [ ] Core Controllers (chat, application, pet, rescue)
13. [ ] Integration tests for critical workflows

---

## Progress Tracking

**Last Updated**: 2025-01-10

**Current Coverage**: 11.17%
**Target Coverage**: 70%+

**Completed Tests**: 16 test files
- ✅ chat.service.test.ts (33 tests passing, ~85% coverage)
- ✅ email.service.test.ts (10 tests passing, ~50% coverage)
- ✅ notification.service.test.ts (23 tests passing, ~70% coverage)
- ✅ admin.service.test.ts (28 tests passing, ~75% coverage)

**Remaining Tests**: ~37+ test files to create

**Phase 1 Progress**: 4/6 (67%) - Chat, Email, Notification, and Admin completed; Analytics deferred
**Phase 2 Progress**: 0/5 (0%)
**Phase 3 Progress**: 0/5 (0%)
**Phase 4 Progress**: 0/6 (0%)
**Phase 5 Progress**: 0/5 (0%)

---

## Notes

- Focus on behavior-driven testing as per project guidelines
- All tests must follow TypeScript strict mode
- Tests should document expected business behavior
- 100% coverage is expected but tests must be behavior-based, not implementation-based
- Use existing test patterns from auth.service.test.ts and pet.service.test.ts as references
