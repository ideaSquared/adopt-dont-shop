# API Endpoints Documentation

## Overview

The Adopt Don't Shop Backend API provides comprehensive RESTful endpoints for managing users, pets, applications, messaging, and administrative functions. All endpoints follow REST conventions and return JSON responses.

## Base Configuration

### Base URLs
- **Development**: `http://localhost:5000`
- **Staging**: `https://api-staging.adoptdontshop.com`
- **Production**: `https://api.adoptdontshop.com`

### API Versioning
All endpoints are versioned using URL path versioning:
- Current version: `/api/v1/`
- Future versions: `/api/v2/`, etc.

### Content Type
All requests and responses use `application/json` content type.

### Authentication
Most endpoints require JWT authentication via the Authorization header:
```http
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "ADOPTER",
  "phoneNumber": "+1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "ADOPTER",
    "status": "PENDING_VERIFICATION",
    "emailVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Validation Rules:**
- Email must be valid and unique
- Password minimum 8 characters with complexity requirements
- userType: `ADOPTER`, `RESCUE_STAFF`, `ADMIN`

### POST /api/v1/auth/login
Authenticate user and return tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "ADOPTER",
    "emailVerified": true,
    "lastLoginAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### POST /api/v1/auth/logout
Invalidate refresh token and logout user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/password/forgot
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /api/v1/auth/password/reset
Reset password using token from email.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### GET /api/v1/auth/verify-email
Verify email address using token.

**Query Parameters:**
- `token` (required): Email verification token

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

## User Management Endpoints

### GET /api/v1/users/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "userType": "ADOPTER",
  "status": "ACTIVE",
  "emailVerified": true,
  "profileImageUrl": "https://example.com/profile.jpg",
  "bio": "Animal lover looking to adopt",
  "location": "San Francisco, CA",
  "preferences": {
    "notifications": true,
    "emailUpdates": true
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLoginAt": "2024-01-15T10:30:00Z"
}
```

### GET /api/v1/users
Search and list users (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (optional): Search term for name/email
- `status` (optional): User status filter
- `userType` (optional): User type filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Response (200):**
```json
{
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "ADOPTER",
      "status": "ACTIVE",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

### GET /api/v1/users/:userId
Get user profile by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "ADOPTER",
  "status": "ACTIVE",
  "profileImageUrl": "https://example.com/profile.jpg",
  "bio": "Animal lover",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### PUT /api/v1/users/:userId
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "bio": "Updated bio",
  "location": "New York, NY",
  "profileImageUrl": "https://example.com/new-profile.jpg"
}
```

**Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "bio": "Updated bio",
  "location": "New York, NY",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### GET /api/v1/users/:userId/activity
Get user activity summary.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "applicationsCount": 5,
    "activeChatsCount": 2,
    "petsFavoritedCount": 12,
    "recentActivity": [
      {
        "action": "application_submitted",
        "entity": "application",
        "timestamp": "2024-01-15T10:00:00Z",
        "details": {
          "petName": "Buddy",
          "rescueName": "Happy Tails Rescue"
        }
      }
    ],
    "stats": {
      "totalLoginCount": 45,
      "averageSessionDuration": 1800,
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "accountCreatedAt": "2024-01-01T00:00:00Z",
      "profileCompleteness": 85
    }
  }
}
```

### DELETE /api/v1/users/account
Delete current user account (self-deletion).

**Headers:** `Authorization: Bearer <token>`

**Request (optional):**
```json
{
  "reason": "No longer need the service"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Notes:**
- This action is irreversible
- All user data, applications, and associated records will be soft-deleted
- The user will be automatically logged out
- Only users can delete their own accounts (admins use a different endpoint)

## Pet Management Endpoints

### GET /api/v1/pets
Search and browse pets.

**Query Parameters:**
- `type` (optional): Pet type (DOG, CAT, etc.)
- `size` (optional): Pet size (SMALL, MEDIUM, LARGE, etc.)
- `age` (optional): Age group (BABY, YOUNG, ADULT, SENIOR)
- `gender` (optional): MALE, FEMALE, UNKNOWN
- `status` (optional): Pet status (default: AVAILABLE)
- `goodWithChildren` (optional): Boolean
- `goodWithDogs` (optional): Boolean
- `goodWithCats` (optional): Boolean
- `specialNeeds` (optional): Boolean
- `location` (optional): Location string for geographic search
- `search` (optional): Text search in name/description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `sortBy` (optional): Sort field (default: featured)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Response (200):**
```json
{
  "pets": [
    {
      "petId": "pet-uuid-1",
      "name": "Buddy",
      "rescueId": "rescue-uuid-1",
      "type": "DOG",
      "breed": "Golden Retriever",
      "age": {
        "years": 3,
        "months": 6
      },
      "ageGroup": "ADULT",
      "gender": "MALE",
      "size": "LARGE",
      "status": "AVAILABLE",
      "shortDescription": "Friendly and energetic dog",
      "images": [
        {
          "imageId": "img-1",
          "url": "https://example.com/buddy-1.jpg",
          "thumbnailUrl": "https://example.com/buddy-1-thumb.jpg",
          "isPrimary": true,
          "caption": "Buddy playing in the yard"
        }
      ],
      "adoptionFee": 250.00,
      "specialNeeds": false,
      "goodWithChildren": true,
      "goodWithDogs": true,
      "goodWithCats": false,
      "energyLevel": "HIGH",
      "location": {
        "city": "San Francisco",
        "state": "CA"
      },
      "rescue": {
        "name": "Happy Tails Rescue",
        "city": "San Francisco",
        "state": "CA"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "availableSince": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 250,
  "page": 1,
  "totalPages": 13,
  "hasNext": true,
  "hasPrev": false
}
```

### GET /api/v1/pets/:petId
Get detailed pet information.

**Response (200):**
```json
{
  "petId": "pet-uuid-1",
  "name": "Buddy",
  "rescueId": "rescue-uuid-1",
  "type": "DOG",
  "breed": "Golden Retriever",
  "secondaryBreed": null,
  "age": {
    "years": 3,
    "months": 6
  },
  "ageGroup": "ADULT",
  "gender": "MALE",
  "size": "LARGE",
  "weight": 30.5,
  "color": "Golden",
  "markings": "White chest patch",
  "status": "AVAILABLE",
  "shortDescription": "Friendly and energetic dog",
  "longDescription": "Buddy is a wonderful Golden Retriever who loves playing fetch...",
  "images": [
    {
      "imageId": "img-1",
      "url": "https://example.com/buddy-1.jpg",
      "thumbnailUrl": "https://example.com/buddy-1-thumb.jpg",
      "isPrimary": true,
      "caption": "Buddy playing in the yard",
      "orderIndex": 0
    }
  ],
  "videos": [
    {
      "videoId": "vid-1",
      "url": "https://example.com/buddy-video.mp4",
      "thumbnailUrl": "https://example.com/buddy-video-thumb.jpg",
      "caption": "Buddy playing fetch",
      "durationSeconds": 45
    }
  ],
  "adoptionFee": 250.00,
  "specialNeeds": false,
  "specialNeedsDescription": null,
  "houseTrained": true,
  "goodWithChildren": true,
  "goodWithDogs": true,
  "goodWithCats": false,
  "goodWithSmallAnimals": null,
  "energyLevel": "HIGH",
  "exerciseNeeds": "Daily walks and playtime",
  "groomingNeeds": "Regular brushing",
  "trainingNotes": "Knows basic commands",
  "temperament": ["friendly", "energetic", "loyal"],
  "medicalNotes": "Up to date on all vaccinations",
  "behavioralNotes": "Great with kids, needs exercise",
  "vaccinationStatus": "UP_TO_DATE",
  "vaccinationDate": "2024-01-01",
  "spayNeuterStatus": "NEUTERED",
  "spayNeuterDate": "2023-06-15",
  "lastVetCheckup": "2024-01-01",
  "microchipId": "123456789",
  "intakeDate": "2023-12-01",
  "availableSince": "2024-01-01T00:00:00Z",
  "viewCount": 45,
  "favoriteCount": 12,
  "applicationCount": 3,
  "rescue": {
    "rescueId": "rescue-uuid-1",
    "name": "Happy Tails Rescue",
    "city": "San Francisco",
    "state": "CA",
    "phone": "+1234567890",
    "email": "info@happytails.org"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### POST /api/v1/pets
Create a new pet (Rescue staff only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Luna",
  "type": "CAT",
  "breed": "Siamese",
  "ageYears": 2,
  "ageMonths": 3,
  "ageGroup": "ADULT",
  "gender": "FEMALE",
  "size": "MEDIUM",
  "weight": 4.5,
  "color": "Seal Point",
  "shortDescription": "Beautiful and affectionate cat",
  "longDescription": "Luna is a stunning Siamese cat...",
  "adoptionFee": 150.00,
  "specialNeeds": false,
  "houseTrained": true,
  "goodWithChildren": true,
  "goodWithDogs": false,
  "goodWithCats": true,
  "energyLevel": "MEDIUM",
  "vaccinationStatus": "UP_TO_DATE",
  "spayNeuterStatus": "SPAYED"
}
```

**Response (201):**
```json
{
  "petId": "new-pet-uuid",
  "name": "Luna",
  "rescueId": "rescue-uuid-1",
  "type": "CAT",
  "status": "AVAILABLE",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### PUT /api/v1/pets/:petId
Update pet information (Rescue staff only).

**Headers:** `Authorization: Bearer <token>`

**Request:** (Same structure as POST, all fields optional)

**Response (200):** (Updated pet object)

### DELETE /api/v1/pets/:petId
Soft delete a pet (Rescue staff only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Pet deleted successfully"
}
```

### POST /api/v1/pets/:petId/images
Upload pet images (Rescue staff only).

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request:** (Form data with image files)

**Response (201):**
```json
{
  "success": true,
  "images": [
    {
      "imageId": "new-img-uuid",
      "url": "https://example.com/new-image.jpg",
      "thumbnailUrl": "https://example.com/new-image-thumb.jpg",
      "isPrimary": false,
      "orderIndex": 1
    }
  ]
}
```

### POST /api/v1/pets/:petId/favorite
Add pet to user's favorites.

**Headers:** `Authorization: Bearer <token>`

**Response (201):**
```json
{
  "success": true,
  "message": "Pet added to favorites"
}
```

### DELETE /api/v1/pets/:petId/favorite
Remove pet from user's favorites.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Pet removed from favorites"
}
```

## Application Management Endpoints

### GET /api/v1/applications
Get user's applications or rescue's received applications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Application status filter
- `petId` (optional): Filter by specific pet
- `userId` (optional): Filter by user (rescue staff only)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Response (200):**
```json
{
  "applications": [
    {
      "applicationId": "app-uuid-1",
      "userId": "user-uuid-1",
      "petId": "pet-uuid-1",
      "rescueId": "rescue-uuid-1",
      "status": "SUBMITTED",
      "priority": "NORMAL",
      "submittedAt": "2024-01-15T10:00:00Z",
      "pet": {
        "name": "Buddy",
        "type": "DOG",
        "breed": "Golden Retriever",
        "primaryImage": "https://example.com/buddy-1.jpg"
      },
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com"
      },
      "rescue": {
        "name": "Happy Tails Rescue"
      },
      "createdAt": "2024-01-15T09:30:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

### GET /api/v1/applications/:applicationId
Get detailed application information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "applicationId": "app-uuid-1",
  "userId": "user-uuid-1",
  "petId": "pet-uuid-1",
  "rescueId": "rescue-uuid-1",
  "status": "UNDER_REVIEW",
  "priority": "NORMAL",
  "answers": {
    "housing_type": "House",
    "has_yard": true,
    "previous_pets": "Yes, had a dog for 10 years",
    "experience_level": "Experienced"
  },
  "references": [
    {
      "name": "Dr. Smith",
      "relationship": "Veterinarian",
      "phone": "+1234567890",
      "email": "dr.smith@vetclinic.com",
      "status": "pending"
    }
  ],
  "documents": [
    {
      "documentId": "doc-uuid-1",
      "documentType": "proof_of_income",
      "fileName": "pay_stub.pdf",
      "fileUrl": "https://example.com/documents/pay_stub.pdf",
      "uploadedAt": "2024-01-15T10:15:00Z",
      "verified": false
    }
  ],
  "notes": "Applicant seems very prepared and experienced",
  "score": 85,
  "tags": ["experienced", "good_references"],
  "submittedAt": "2024-01-15T10:00:00Z",
  "reviewedAt": "2024-01-15T11:00:00Z",
  "actionedBy": "rescue-staff-uuid",
  "pet": {
    "name": "Buddy",
    "type": "DOG",
    "breed": "Golden Retriever"
  },
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "phoneNumber": "+1234567890"
  },
  "createdAt": "2024-01-15T09:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### POST /api/v1/applications
Submit a new adoption application.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "petId": "pet-uuid-1",
  "answers": {
    "housing_type": "House",
    "has_yard": true,
    "yard_fenced": true,
    "previous_pets": "Yes, had a dog for 10 years",
    "experience_level": "Experienced",
    "hours_alone": "4-6 hours",
    "exercise_plan": "Daily walks and weekend hikes"
  },
  "references": [
    {
      "name": "Dr. Smith",
      "relationship": "Veterinarian",
      "phone": "+1234567890",
      "email": "dr.smith@vetclinic.com"
    },
    {
      "name": "Jane Wilson",
      "relationship": "Friend",
      "phone": "+0987654321",
      "email": "jane@example.com"
    }
  ]
}
```

**Response (201):**
```json
{
  "applicationId": "new-app-uuid",
  "status": "SUBMITTED",
  "submittedAt": "2024-01-15T10:30:00Z",
  "message": "Application submitted successfully"
}
```

### PATCH /api/v1/applications/:applicationId/status
Update application status (Rescue staff only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "status": "APPROVED",
  "notes": "Great applicant, approved for adoption",
  "conditionalRequirements": []
}
```

**Response (200):**
```json
{
  "success": true,
  "application": {
    "applicationId": "app-uuid-1",
    "status": "APPROVED",
    "actionedBy": "rescue-staff-uuid",
    "actionedAt": "2024-01-15T11:30:00Z",
    "notes": "Great applicant, approved for adoption"
  }
}
```

### DELETE /api/v1/applications/:applicationId
Withdraw application (User only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Application withdrawn successfully"
}
```

## Messaging Endpoints

### GET /api/v1/conversations
Get user's conversations.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Conversation status filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "conversations": [
    {
      "chatId": "chat-uuid-1",
      "applicationId": "app-uuid-1",
      "rescueId": "rescue-uuid-1",
      "status": "active",
      "participants": [
        {
          "userId": "user-uuid-1",
          "firstName": "John",
          "lastName": "Doe",
          "role": "user",
          "lastReadAt": "2024-01-15T10:30:00Z"
        },
        {
          "userId": "rescue-staff-uuid",
          "firstName": "Sarah",
          "lastName": "Johnson",
          "role": "rescue",
          "lastReadAt": "2024-01-15T11:00:00Z"
        }
      ],
      "lastMessage": {
        "messageId": "msg-uuid-1",
        "senderId": "user-uuid-1",
        "content": "Thank you for considering my application!",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "unreadCount": 0,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1
}
```

### POST /api/v1/conversations
Create a new conversation.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "participantIds": ["rescue-staff-uuid"],
  "applicationId": "app-uuid-1",
  "initialMessage": "Hello, I have some questions about Buddy's adoption."
}
```

**Response (201):**
```json
{
  "chatId": "new-chat-uuid",
  "applicationId": "app-uuid-1",
  "status": "active",
  "participants": [
    {
      "userId": "user-uuid-1",
      "role": "user"
    },
    {
      "userId": "rescue-staff-uuid",
      "role": "rescue"
    }
  ],
  "createdAt": "2024-01-15T11:30:00Z"
}
```

### GET /api/v1/conversations/:chatId/messages
Get messages in a conversation.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)
- `before` (optional): Get messages before timestamp
- `after` (optional): Get messages after timestamp

**Response (200):**
```json
{
  "messages": [
    {
      "messageId": "msg-uuid-1",
      "chatId": "chat-uuid-1",
      "senderId": "user-uuid-1",
      "content": "Hello, I have some questions about Buddy.",
      "contentFormat": "plain",
      "attachments": [],
      "reactions": [
        {
          "userId": "rescue-staff-uuid",
          "emoji": "👍",
          "createdAt": "2024-01-15T10:35:00Z"
        }
      ],
      "readStatus": [
        {
          "userId": "user-uuid-1",
          "readAt": "2024-01-15T10:30:00Z"
        },
        {
          "userId": "rescue-staff-uuid",
          "readAt": "2024-01-15T10:35:00Z"
        }
      ],
      "sender": {
        "firstName": "John",
        "lastName": "Doe",
        "profileImageUrl": "https://example.com/profile.jpg"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 1,
  "hasNext": false,
  "hasPrev": false
}
```

### POST /api/v1/conversations/:chatId/messages
Send a message in a conversation.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "content": "Thank you for the quick response!",
  "contentFormat": "plain",
  "replyToId": "msg-uuid-1"
}
```

**Response (201):**
```json
{
  "messageId": "new-msg-uuid",
  "chatId": "chat-uuid-1",
  "senderId": "user-uuid-1",
  "content": "Thank you for the quick response!",
  "contentFormat": "plain",
  "replyToId": "msg-uuid-1",
  "createdAt": "2024-01-15T11:30:00Z"
}
```

### POST /api/v1/conversations/:chatId/read
Mark messages as read.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "messageId": "msg-uuid-1"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

## Rescue Management Endpoints

### GET /api/v1/rescues
Search rescue organizations.

**Query Parameters:**
- `search` (optional): Search term for name/location
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `status` (optional): Filter by verification status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "rescues": [
    {
      "rescueId": "rescue-uuid-1",
      "name": "Happy Tails Rescue",
      "city": "San Francisco",
      "state": "CA",
      "description": "Dedicated to finding homes for abandoned pets",
      "website": "https://happytails.org",
      "phone": "+1234567890",
      "email": "info@happytails.org",
      "status": "verified",
      "verifiedAt": "2024-01-01T00:00:00Z",
      "activePetsCount": 25,
      "successfulAdoptionsCount": 150,
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

### GET /api/v1/rescues/:rescueId
Get detailed rescue information.

**Response (200):**
```json
{
  "rescueId": "rescue-uuid-1",
  "name": "Happy Tails Rescue",
  "email": "info@happytails.org",
  "phone": "+1234567890",
  "address": "123 Main Street",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94102",
  "country": "United States",
  "website": "https://happytails.org",
  "description": "We are a non-profit organization dedicated to rescuing and rehoming abandoned pets.",
  "mission": "To provide loving homes for every pet in need.",
  "ein": "12-3456789",
  "contactPerson": "Sarah Johnson",
  "contactTitle": "Director",
  "contactEmail": "sarah@happytails.org",
  "contactPhone": "+1234567890",
  "status": "verified",
  "verifiedAt": "2024-01-01T00:00:00Z",
  "settings": {
    "autoApproveApplications": false,
    "requireHomeVisit": true,
    "adoptionFeeRange": {
      "min": 100,
      "max": 500
    }
  },
  "stats": {
    "activePetsCount": 25,
    "pendingApplicationsCount": 8,
    "successfulAdoptionsCount": 150,
    "totalPetsRescued": 200
  },
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Admin Endpoints

### GET /api/v1/admin/dashboard
Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 1100,
      "newThisMonth": 85,
      "byType": {
        "ADOPTER": 1000,
        "RESCUE_STAFF": 240,
        "ADMIN": 10
      }
    },
    "pets": {
      "total": 450,
      "available": 320,
      "adopted": 120,
      "pending": 10,
      "byType": {
        "DOG": 280,
        "CAT": 150,
        "OTHER": 20
      }
    },
    "applications": {
      "total": 890,
      "pending": 45,
      "approved": 320,
      "rejected": 125,
      "thisMonth": 67
    },
    "rescues": {
      "total": 85,
      "verified": 78,
      "pending": 7,
      "newThisMonth": 3
    },
    "activity": {
      "messagesThisWeek": 450,
      "applicationsThisWeek": 23,
      "adoptionsThisWeek": 8
    }
  }
}
```

### GET /api/v1/admin/users
Get all users with admin filters.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:** (Same as GET /api/v1/users but with additional admin filters)

### GET /api/v1/admin/moderation/reports
Get moderation reports.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `status` (optional): Report status filter
- `category` (optional): Report category filter
- `severity` (optional): Report severity filter
- `assignedModerator` (optional): Filter by assigned moderator
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "reportId": "report-uuid-1",
      "reporterId": "user-uuid-1",
      "reportedEntityType": "user",
      "reportedEntityId": "user-uuid-2",
      "category": "harassment",
      "severity": "high",
      "status": "pending",
      "title": "Inappropriate messaging",
      "description": "User sending inappropriate messages",
      "assignedModerator": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "reporter": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

## Health Check Endpoints

### GET /health
Simple health check.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T11:30:00Z"
}
```

### GET /health/detailed
Comprehensive health check.

**Response (200):**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "timestamp": "2024-01-15T11:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 25,
      "details": "Connected to PostgreSQL database",
      "lastChecked": "2024-01-15T11:30:00Z"
    },
    "email": {
      "status": "healthy",
      "responseTime": 150,
      "details": "SendGrid email provider ready",
      "lastChecked": "2024-01-15T11:30:00Z"
    },
    "storage": {
      "status": "healthy",
      "responseTime": 75,
      "details": "AWS S3 storage accessible",
      "lastChecked": "2024-01-15T11:30:00Z"
    },
    "fileSystem": {
      "status": "healthy",
      "responseTime": 10,
      "details": "Available space: 15GB",
      "lastChecked": "2024-01-15T11:30:00Z"
    }
  },
  "metrics": {
    "memoryUsage": {
      "used": 134217728,
      "total": 536870912,
      "percentage": 25
    },
    "cpuUsage": {
      "user": 12500,
      "system": 3200
    },
    "activeConnections": 45
  }
}
```

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2024-01-15T11:30:00Z"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate email)
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Validation Error Example

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  },
  "timestamp": "2024-01-15T11:30:00Z"
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

### Rate Limits by Endpoint Type

- **Authentication endpoints**: 5 requests per 15 minutes
- **Standard API endpoints**: 100 requests per 15 minutes
- **Upload endpoints**: 10 requests per 15 minutes
- **Search endpoints**: 60 requests per 15 minutes

---

This comprehensive API documentation provides all the information needed to integrate with the Adopt Don't Shop Backend Service.