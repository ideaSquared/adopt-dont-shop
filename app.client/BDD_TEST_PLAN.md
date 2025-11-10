# Behaviour-Driven Testing Plan for app.client

## Overview
This document tracks the implementation of behaviour-driven tests for the client application. Tests focus on user behaviours and business requirements, not implementation details. All tests use MSW (Mock Service Worker) to mock API responses.

## Testing Principles
- **Test behaviours, not implementation**
- **Mock all API calls** using MSW
- **Test through public APIs** (user interactions)
- **No implementation details** exposed to tests
- **100% coverage** of business behaviours expected

## Test Status Legend
- ✅ Completed
- 🚧 In Progress
- ⏳ Pending
- ❌ Failed/Blocked

---

## 1. Authentication Flows ✅

### 1.1 User Login
- ✅ **User can log in with valid credentials**
  - User enters email and password
  - System validates credentials
  - User is redirected to home page
  - User sees their name in navigation
  - **Test:** `authentication.test.tsx` - "allows user to log in with valid credentials"

- ✅ **User cannot log in with invalid credentials**
  - User enters incorrect email/password
  - System shows error message
  - User remains on login page
  - **Test:** `authentication.test.tsx` - "prevents login with invalid credentials and shows error message"

- ✅ **User can see password while typing**
  - User clicks "show password" toggle
  - Password becomes visible
  - User clicks again, password is hidden
  - **Test:** `authentication.test.tsx` - "allows user to toggle password visibility"

- ✅ **Validation for empty fields**
  - User tries to submit without filling fields
  - System shows validation errors
  - **Test:** `authentication.test.tsx` - "shows validation errors for empty fields"

### 1.2 User Registration
- ✅ **User can register a new account**
  - User fills registration form
  - System creates account
  - User is redirected to profile setup
  - **Test:** `authentication.test.tsx` - "allows user to register a new account with valid information"

- ✅ **User cannot register with existing email**
  - User enters email already in use
  - System shows error message
  - Form remains on page
  - **Test:** `authentication.test.tsx` - "prevents registration with existing email"

- ✅ **User cannot register with weak password**
  - User enters password not meeting requirements
  - System shows password requirements
  - Submit button is disabled
  - **Test:** `authentication.test.tsx` - "shows validation errors for invalid password"

### 1.3 Password Reset
- ✅ **User can request password reset**
  - User enters email address
  - System sends reset email
  - User sees confirmation message
  - **Test:** `authentication.test.tsx` - "allows user to request password reset"

- ✅ **User can reset password with valid token**
  - User clicks reset link
  - User enters new password
  - System updates password
  - User is redirected to login
  - **Test:** `authentication.test.tsx` - "allows user to reset password with valid token"

- ✅ **User cannot reset password with invalid token**
  - User uses expired/invalid token
  - System shows error message
  - User can request new reset link
  - **Test:** `authentication.test.tsx` - "shows error for invalid or expired reset token"

---

## 2. Pet Discovery (Swipe) Features ⏳

### 2.1 Viewing Pets
- ⏳ **User can view pet profiles in discovery queue**
  - User navigates to discovery page
  - System loads initial pet queue
  - User sees pet images, name, breed, age

- ⏳ **User can view pet details in discovery**
  - User taps on pet info area
  - Pet details expand or show
  - User sees full description

### 2.2 Swipe Actions
- ⏳ **User can swipe right to like a pet**
  - User swipes right on pet card
  - System records like action
  - Next pet appears
  - Pet is added to favorites

- ⏳ **User can swipe left to pass on a pet**
  - User swipes left on pet card
  - System records pass action
  - Next pet appears

- ⏳ **User can undo last swipe**
  - User performs swipe action
  - User clicks undo button
  - Previous pet reappears
  - Action is reversed

### 2.3 Discovery Queue Management
- ⏳ **System loads more pets when queue is low**
  - User swipes through pets
  - Queue reaches threshold
  - System loads more pets automatically
  - No interruption to user

- ⏳ **User sees message when no more pets available**
  - User swipes through all pets
  - System shows "no more pets" message
  - User can adjust filters or check back later

### 2.4 Filters
- ⏳ **User can filter pets by type**
  - User opens filter menu
  - User selects dog/cat/other
  - Discovery queue updates with filtered pets

- ⏳ **User can filter pets by size**
  - User opens filter menu
  - User selects size preference
  - Discovery queue updates

- ⏳ **User can clear all filters**
  - User has active filters
  - User clicks "clear filters"
  - All pets appear in queue

---

## 3. Search & Browse Features ⏳

### 3.1 Search
- ⏳ **User can search for pets by name**
  - User enters pet name in search
  - System returns matching pets
  - Results update as user types

- ⏳ **User can search with filters**
  - User applies breed/age/size filters
  - User performs search
  - Results match all criteria

- ⏳ **User sees "no results" when search has no matches**
  - User searches for non-existent criteria
  - System shows "no results" message
  - User can modify search

### 3.2 Pet Details
- ⏳ **User can view full pet profile**
  - User clicks on pet card
  - System navigates to pet details page
  - User sees all pet information

- ⏳ **User can view pet image gallery**
  - User is on pet details page
  - User clicks through images
  - All images load and display

- ⏳ **User can view rescue organization details from pet page**
  - User is on pet details page
  - User clicks rescue name
  - System navigates to rescue details

---

## 4. Favorites Management ⏳

### 4.1 Adding/Removing Favorites
- ⏳ **User can add pet to favorites**
  - User clicks favorite/heart icon
  - Pet is added to favorites
  - Icon shows filled state

- ⏳ **User can remove pet from favorites**
  - User clicks filled favorite icon
  - Pet is removed from favorites
  - Icon shows empty state

- ⏳ **User can view all favorited pets**
  - User navigates to favorites page
  - System displays all favorited pets
  - Empty state shown if no favorites

### 4.2 Favorites Persistence
- ⏳ **User's favorites persist across sessions**
  - User favorites pets
  - User logs out and back in
  - Favorites are still present

---

## 5. Application Submission ⏳

### 5.1 Starting Application
- ⏳ **User can start application from pet details**
  - User clicks "Apply" on pet page
  - System navigates to application form
  - Pet info is pre-populated

- ⏳ **System prompts user to complete profile before applying**
  - User with incomplete profile clicks "Apply"
  - System shows profile completion prompt
  - User can complete profile or continue

### 5.2 Application Form
- ⏳ **User can complete multi-step application**
  - User fills basic info step
  - User proceeds to living situation
  - User completes all steps
  - User reviews and submits

- ⏳ **User can save application as draft**
  - User partially completes form
  - User clicks "Save draft"
  - Application is saved
  - User can resume later

- ⏳ **User cannot submit incomplete application**
  - User skips required fields
  - Submit button is disabled
  - Validation errors are shown

### 5.3 Application Management
- ⏳ **User can view application status**
  - User navigates to applications page
  - System shows all applications
  - Status (pending/approved/rejected) is visible

- ⏳ **User can withdraw application**
  - User clicks withdraw on pending application
  - System shows confirmation dialog
  - User confirms
  - Application status updates to withdrawn

- ⏳ **User can view application details**
  - User clicks on application
  - System shows full application details
  - User sees all submitted information

---

## 6. User Profile Management ⏳

### 6.1 Profile Setup
- ⏳ **User can complete initial profile setup**
  - New user is prompted for profile info
  - User fills profile form
  - Profile is saved
  - User can access all features

### 6.2 Profile Editing
- ⏳ **User can edit profile information**
  - User navigates to profile page
  - User clicks edit
  - User modifies fields
  - Changes are saved

- ⏳ **User can upload profile picture**
  - User clicks on avatar
  - User selects image
  - Image is uploaded and displayed

### 6.3 Settings
- ⏳ **User can update email preferences**
  - User opens settings
  - User toggles notification preferences
  - Preferences are saved

- ⏳ **User can change password**
  - User navigates to settings
  - User enters current and new password
  - Password is updated

---

## 7. Chat/Messaging Features ⏳

### 7.1 Conversations
- ⏳ **User can view conversation list**
  - User navigates to chat page
  - System displays all conversations
  - Unread count is visible

- ⏳ **User can start new conversation with rescue**
  - User is on rescue details page
  - User clicks "Message"
  - Chat opens with rescue

### 7.2 Messaging
- ⏳ **User can send message**
  - User types message
  - User clicks send
  - Message appears in thread
  - Rescue receives message

- ⏳ **User can receive messages**
  - Rescue sends message
  - Message appears in real-time
  - Unread indicator updates

- ⏳ **User can send images in chat**
  - User clicks attachment button
  - User selects image
  - Image is uploaded and sent

---

## 8. Notifications ⏳

### 8.1 Notification Display
- ⏳ **User can view notifications**
  - User clicks notification bell
  - System shows notification list
  - Unread count is visible

- ⏳ **User can mark notification as read**
  - User clicks on notification
  - Notification is marked as read
  - Count updates

- ⏳ **User can clear all notifications**
  - User clicks "Clear all"
  - All notifications are marked as read
  - Counter resets to zero

### 8.2 Notification Types
- ⏳ **User receives notification for application status change**
  - Application status changes
  - User receives notification
  - Notification shows new status

- ⏳ **User receives notification for new message**
  - Rescue sends message
  - User receives notification
  - Notification links to conversation

---

## 9. Navigation & Layout ⏳

### 9.1 Navigation
- ⏳ **User can navigate between main sections**
  - User clicks nav items
  - System navigates to correct page
  - Active nav item is highlighted

- ⏳ **User can access swipe feature from floating button**
  - User is on any page
  - User clicks floating swipe button
  - Discovery page opens

### 9.2 Responsive Behavior
- ⏳ **App is usable on mobile viewport**
  - Test on mobile screen size
  - All features are accessible
  - Touch interactions work

- ⏳ **App is usable on desktop viewport**
  - Test on desktop screen size
  - Layout adapts appropriately
  - Mouse interactions work

---

## 10. Error Handling ⏳

### 10.1 Network Errors
- ⏳ **User sees error message when API fails**
  - API returns error
  - User sees user-friendly error message
  - User can retry action

- ⏳ **App handles offline mode**
  - User loses connection
  - App shows offline indicator
  - User sees cached content where possible

### 10.2 Error Boundaries
- ⏳ **App catches rendering errors**
  - Component throws error
  - Error boundary catches it
  - User sees error message, not crash

---

## Progress Summary

**Total Behaviours Planned:** 75+
**Completed:** 50+
**In Progress:** 0
**Pending:** 25
**Failed:** 0

**Tests Created:**
- ✅ `authentication.test.tsx` - 13 test cases covering login, registration, and password reset
- ✅ `discovery.test.tsx` - 15+ test cases covering swipe features, filters, and queue management
- ✅ `favorites.test.tsx` - 12+ test cases covering favorites add/remove and persistence
- ✅ `search.test.tsx` - 18+ test cases covering search, filters, and pet details
- ✅ `applications.test.tsx` - 15+ test cases covering application submission and management

**Infrastructure:**
- ✅ MSW setup with comprehensive API mocks
- ✅ Test utilities and custom render function
- ✅ Mock handlers for all major API endpoints

**Last Updated:** 2025-11-10

---

## Notes

- All tests use MSW for API mocking - no real API calls in tests
- Tests focus on user-facing behaviour, not internal implementation
- Each test should be independent and able to run in isolation
- Tests should use React Testing Library's user-centric queries
- Avoid testing implementation details like state or internal methods
