# Admin Services API Documentation

## Overview

This API provides admin-specific functionalities including user management and system overview tasks that are restricted to admin users only.

## API Endpoints

### Fetch All Users

| Endpoint | Method | Authentication | Admin Check | Description                                 | Success Response            | Error Response             |
| -------- | ------ | -------------- | ----------- | ------------------------------------------- | --------------------------- | -------------------------- |
| `/users` | GET    | Required       | Required    | Fetches all user records from the database. | 200: Returns all user data. | 500: Error fetching users. |

### Delete a User

| Endpoint            | Method | Authentication | Admin Check | Description                                            | Request Params | Success Response                | Error Response                          |
| ------------------- | ------ | -------------- | ----------- | ------------------------------------------------------ | -------------- | ------------------------------- | --------------------------------------- |
| `/users/delete/:id` | DELETE | Required       | Required    | Deletes a specific user by their ID from the database. | `id`: User ID  | 200: User deleted successfully. | 404: User not found; 500: Server error. |

### Reset User Password

| Endpoint                    | Method | Authentication | Admin Check | Description                                              | Request Params | Success Response              | Error Response                          |
| --------------------------- | ------ | -------------- | ----------- | -------------------------------------------------------- | -------------- | ----------------------------- | --------------------------------------- |
| `/users/reset-password/:id` | POST   | Required       | Required    | Forces a password reset for a specific user by their ID. | `id`: User ID  | 200: Password reset enforced. | 404: User not found; 500: Server error. |

### Get All Conversations

| Endpoint         | Method | Authentication | Admin Check | Description                                    | Success Response                | Error Response                     |
| ---------------- | ------ | -------------- | ----------- | ---------------------------------------------- | ------------------------------- | ---------------------------------- |
| `/conversations` | GET    | Required       | Required    | Retrieves all conversations across the system. | 200: List of all conversations. | 500: Error fetching conversations. |

### Get Messages for a Conversation

| Endpoint                                  | Method | Authentication | Admin Check | Description                                         | Request Params                    | Success Response                              | Error Response                |
| ----------------------------------------- | ------ | -------------- | ----------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------- | ----------------------------- |
| `/conversations/:conversationId/messages` | GET    | Required       | Required    | Retrieves all messages for a specific conversation. | `conversationId`: Conversation ID | 200: Messages for the specified conversation. | 500: Error fetching messages. |

### Delete a Conversation

| Endpoint             | Method | Authentication | Admin Check | Description                                | Request Params        | Success Response                        | Error Response                                  |
| -------------------- | ------ | -------------- | ----------- | ------------------------------------------ | --------------------- | --------------------------------------- | ----------------------------------------------- |
| `/conversations/:id` | DELETE | Required       | Required    | Deletes a specific conversation by its ID. | `id`: Conversation ID | 200: Conversation deleted successfully. | 404: Conversation not found; 500: Server error. |

### Fetch All Rescues

| Endpoint   | Method | Authentication | Admin Check | Description                                                      | Success Response                                    | Error Response               |
| ---------- | ------ | -------------- | ----------- | ---------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| `/rescues` | GET    | Required       | Required    | Retrieves all rescue organizations and associated staff details. | 200: List of all rescues with detailed information. | 500: Error fetching rescues. |

### Fetch Specific Rescue

| Endpoint       | Method | Authentication | Admin Check | Description                                                    | Request Params  | Success Response                                   | Error Response                            |
| -------------- | ------ | -------------- | ----------- | -------------------------------------------------------------- | --------------- | -------------------------------------------------- | ----------------------------------------- |
| `/rescues/:id` | GET    | Required       | Required    | Retrieves details of a specific rescue organization by its ID. | `id`: Rescue ID | 200: Detailed information of the specified rescue. | 404: Rescue not found; 500: Server error. |

### Delete a Rescue

| Endpoint       | Method | Authentication | Admin Check | Description                                       | Request Params  | Success Response                  | Error Response                            |
| -------------- | ------ | -------------- | ----------- | ------------------------------------------------- | --------------- | --------------------------------- | ----------------------------------------- |
| `/rescues/:id` | DELETE | Required       | Required    | Deletes a specific rescue organization by its ID. | `id`: Rescue ID | 200: Rescue deleted successfully. | 404: Rescue not found; 500: Server error. |

### Fetch All Pets

| Endpoint | Method | Authentication | Admin Check | Description                                                | Success Response                          | Error Response            |
| -------- | ------ | -------------- | ----------- | ---------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| `/pets`  | GET    | Required       | Required    | Retrieves all pets and their associated owner information. | 200: List of all pets with owner details. | 500: Error fetching pets. |

### Fetch Specific Pet

| Endpoint    | Method | Authentication | Admin Check | Description                                    | Request Params | Success Response                                | Error Response                         |
| ----------- | ------ | -------------- | ----------- | ---------------------------------------------- | -------------- | ----------------------------------------------- | -------------------------------------- |
| `/pets/:id` | GET    | Required       | Required    | Retrieves details of a specific pet by its ID. | `id`: Pet ID   | 200: Detailed information of the specified pet. | 404: Pet not found; 500: Server error. |

### Delete a Pet

| Endpoint    | Method | Authentication | Admin Check | Description                       | Request Params | Success Response               | Error Response                         |
| ----------- | ------ | -------------- | ----------- | --------------------------------- | -------------- | ------------------------------ | -------------------------------------- |
| `/pets/:id` | DELETE | Required       | Required    | Deletes a specific pet by its ID. | `id`: Pet ID   | 200: Pet deleted successfully. | 404: Pet not found; 500: Server error. |

### Delete a Staff Member from a Rescue

| Endpoint                            | Method | Authentication | Admin Check | Description                                                     | Request Params                                           | Success Response                        | Error Response                                  |
| ----------------------------------- | ------ | -------------- | ----------- | --------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| `/rescues/:rescueId/staff/:staffId` | DELETE | Required       | Required    | Deletes a staff member from a specific rescue by their user ID. | `rescueId`: Rescue ID, `staffId`: Staff Member's User ID | 200: Staff member deleted successfully. | 404: Staff member not found; 500: Server error. |

### Statistics: Created Count

| Endpoint               | Method | Authentication | Admin Check | Description                                                                                 | Request Params           | Success Response                    | Error Response     |
| ---------------------- | ------ | -------------- | ----------- | ------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------- | ------------------ |
| `/stats-created-count` | GET    | Required       | Required    | Provides statistics on the count of various entities created within a specified time frame. | `from`, `to`: Date range | 200: Statistics for created counts. | 500: Server error. |

### Statistics: Total Count

| Endpoint             | Method | Authentication | Admin Check | Description                                                         | Success Response             | Error Response     |
| -------------------- | ------ | -------------- | ----------- | ------------------------------------------------------------------- | ---------------------------- | ------------------ |
| `/stats-total-count` | GET    | Required       | Required    | Provides total count statistics for various entities in the system. | 200: Total count statistics. | 500: Server error. |

### Statistics: All Locations

| Endpoint               | Method | Authentication | Admin Check | Description                                               | Success Response                 | Error Response     |
| ---------------------- | ------ | -------------- | ----------- | --------------------------------------------------------- | -------------------------------- | ------------------ |
| `/stats-all-locations` | GET    | Required       | Required    | Provides geographical location data for various entities. | 200: Location data for entities. | 500: Server error. |

# Authentication and User Management API Documentation

## Overview

This API facilitates user management including registration, login, email verification, password reset, and user detail updates.

## API Endpoints

### Register a New User

| Endpoint    | Method | Authentication | Description                                                                                          | Request Body                                                                                                                                  | Success Response                                  | Error Response                                            |
| ----------- | ------ | -------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `/register` | POST   | No             | Registers a new user with details provided in the request. Performs geolocation lookup if necessary. | `{ "email": "example@example.com", "password": "password123", "firstName": "John", "lastName": "Doe", "city": "City", "country": "Country" }` | 201: User created successfully with user details. | 409: User already exists; 500: Server or geocoding error. |

### Verify User Email

| Endpoint        | Method | Authentication | Description                                                          | Query Params    | Success Response                  | Error Response                                    |
| --------------- | ------ | -------------- | -------------------------------------------------------------------- | --------------- | --------------------------------- | ------------------------------------------------- |
| `/verify-email` | GET    | No             | Verifies user's email using the token provided as a query parameter. | `?token=abc123` | 200: Email verified successfully. | 400: Invalid or expired token; 500: Server error. |

### User Login

| Endpoint | Method | Authentication | Description                                                                                    | Request Body                                                    | Success Response                                     | Error Response                                                        |
| -------- | ------ | -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `/login` | POST   | No             | Authenticates user based on email and password. Sets a HttpOnly cookie with JWT if successful. | `{ "email": "example@example.com", "password": "password123" }` | 200: User logged in with JWT token and user details. | 401: Invalid credentials; 403: Email not verified; 500: Server error. |

### Validate User Session

| Endpoint            | Method | Authentication | Description                                                                | Success Response                         | Error Response                 |
| ------------------- | ------ | -------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `/validate-session` | GET    | Required       | Validates the user's current session by checking the authentication token. | 200: Session is valid with user details. | 401: Invalid or expired token. |

### Update User Details

| Endpoint   | Method | Authentication | Description                                                                       | Request Body                                          | Success Response                        | Error Response                                       |
| ---------- | ------ | -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `/details` | PUT    | Required       | Allows authenticated users to update their own details. Supports partial updates. | `{ "email": "new@example.com", "firstName": "Jane" }` | 200: User details updated successfully. | 404: User not found; 500: Server or geocoding error. |

### Initiate Password Reset

| Endpoint           | Method | Authentication | Description                                                                                 | Request Body                         | Success Response                    | Error Response                          |
| ------------------ | ------ | -------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------- | --------------------------------------- |
| `/forgot-password` | POST   | No             | Initiates a password reset process by sending an email to the user with reset instructions. | `{ "email": "example@example.com" }` | 200: Reset email sent successfully. | 404: User not found; 500: Server error. |

### Reset Password

| Endpoint          | Method | Authentication | Description                                           | Request Body                                             | Success Response                  | Error Response                                    |
| ----------------- | ------ | -------------- | ----------------------------------------------------- | -------------------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| `/reset-password` | POST   | No             | Resets the user's password using a valid reset token. | `{ "token": "abc123", "newPassword": "newPassword123" }` | 200: Password reset successfully. | 400: Invalid or expired token; 500: Server error. |

### User Logout

| Endpoint  | Method | Authentication | Description                                              | Success Response              | Error Response |
| --------- | ------ | -------------- | -------------------------------------------------------- | ----------------------------- | -------------- |
| `/logout` | POST   | Required       | Logs out the user by clearing the authentication cookie. | 200: Logged out successfully. | None           |

### Fetch User's Rescue Organization Details

| Endpoint     | Method | Authentication | Description                                                                             | Success Response                  | Error Response                                                       |
| ------------ | ------ | -------------- | --------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `/my-rescue` | GET    | Required       | Retrieves details about the rescue organization associated with the authenticated user. | 200: Rescue organization details. | 404: User is not part of any rescue organization; 500: Server error. |

### Fetch User Permissions

| Endpoint       | Method | Authentication | Description                                                     | Success Response          | Error Response                                                |
| -------------- | ------ | -------------- | --------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| `/permissions` | GET    | Required       | Fetches the permissions associated with the authenticated user. | 200: Permissions details. | 404: User is not part of any organization; 500: Server error. |

# Conversation Management API Documentation

## Overview

This API handles the creation, retrieval, and management of conversations and messages, ensuring secure and efficient communication between users and rescue organizations.

## API Endpoints

### Create a New Conversation

| Endpoint | Method | Authentication | Description                                                             | Request Body                                                                   | Success Response           | Error Response                                |
| -------- | ------ | -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------- |
| `/`      | POST   | Required       | Creates a new conversation with specified participants and related pet. | `{ "participants": [{"userId": 1, "participantType": "User"}], "petId": 123 }` | 201: Conversation created. | 400: Invalid participants; 500: Server error. |

### Get All Conversations for a User

| Endpoint | Method | Authentication | Description                                             | Query Params                 | Success Response            | Error Response     |
| -------- | ------ | -------------- | ------------------------------------------------------- | ---------------------------- | --------------------------- | ------------------ |
| `/`      | GET    | Required       | Retrieves all conversations for the authenticated user. | `type=Rescue` or `type=User` | 200: List of conversations. | 500: Server error. |

### Get Specific Conversation by ID

| Endpoint           | Method | Authentication | Middleware         | Description                                                           | Success Response           | Error Response                                             |
| ------------------ | ------ | -------------- | ------------------ | --------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `/:conversationId` | GET    | Required       | `checkParticipant` | Retrieves a specific conversation by ID if the user is a participant. | 200: Conversation details. | 403: Not a participant; 404: Not found; 500: Server error. |

### Delete a Conversation

| Endpoint           | Method | Authentication | Description                                      | Success Response           | Error Response                     |
| ------------------ | ------ | -------------- | ------------------------------------------------ | -------------------------- | ---------------------------------- |
| `/:conversationId` | DELETE | Required       | Deletes a specified conversation if permissible. | 204: Conversation deleted. | 404: Not found; 500: Server error. |

### Create a New Message in a Conversation

| Endpoint                    | Method | Authentication | Validation      | Description                                  | Request Body                  | Success Response      | Error Response                                                             |
| --------------------------- | ------ | -------------- | --------------- | -------------------------------------------- | ----------------------------- | --------------------- | -------------------------------------------------------------------------- |
| `/messages/:conversationId` | POST   | Required       | `messageSchema` | Creates a new message within a conversation. | `{ "messageText": "Hello!" }` | 201: Message created. | 400: Missing message text; 404: Conversation not found; 500: Server error. |

### Get All Messages in a Conversation

| Endpoint                    | Method | Authentication | Description                                           | Success Response       | Error Response     |
| --------------------------- | ------ | -------------- | ----------------------------------------------------- | ---------------------- | ------------------ |
| `/messages/:conversationId` | GET    | Required       | Retrieves all messages from a specified conversation. | 200: List of messages. | 500: Server error. |

### Mark Messages as Read in a Conversation

| Endpoint                         | Method | Authentication | Description                                               | Request Body             | Success Response              | Error Response                             |
| -------------------------------- | ------ | -------------- | --------------------------------------------------------- | ------------------------ | ----------------------------- | ------------------------------------------ |
| `/messages/read/:conversationId` | PUT    | Required       | Marks all messages as read in the specified conversation. | `{ "userType": "User" }` | 200: Messages marked as read. | 400: Invalid user type; 500: Server error. |

## Middleware Details

### Check Participant Middleware

- **Purpose**: Verifies that the authenticated user is a participant in the target conversation.
- **Implementation**: Queries the database to ensure the user's presence in the conversation participants.

## Error Handling

- All endpoints implement error handling that logs the incident and returns an appropriate HTTP status code along with an error message. Sentry is utilized for tracking and managing errors effectively.

## Logging

- Each operation within the API logs an informational or error message using the LoggerUtil utility to help with monitoring and troubleshooting.

## Security

- Authentication is required for all endpoints, ensuring that only logged-in users can access the routes.
- Certain actions, such as deleting a conversation or accessing specific conversations, check user permissions or participation to prevent unauthorized access.

# Logger Service API Documentation

## Overview

This API allows for retrieving logs securely, ensuring that only authenticated and authorized (admin) users can access the log entries.

## API Endpoint

### Get Log Entries

| Endpoint | Method | Authentication Required | Admin Required | Description                       | Response                                                  |
| -------- | ------ | ----------------------- | -------------- | --------------------------------- | --------------------------------------------------------- |
| `/`      | GET    | Yes                     | Yes            | Retrieves the server log entries. | JSON array of log entries or an error message on failure. |

## Ratings API Documentation

### Create a New Rating

| Method | Path | Authentication | Validation     | Description                                              | Success Response                                   | Error Response                         |
| ------ | ---- | -------------- | -------------- | -------------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| POST   | `/`  | Required       | `ratingSchema` | Creates a new rating for a pet by an authenticated user. | 201: Rating created successfully with rating data. | 404: Pet not found; 500: Server error. |

### Retrieve Ratings by Target ID

| Method | Path                | Authentication | Validation | Description                                                                   | Success Response                                    | Error Response                            |
| ------ | ------------------- | -------------- | ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| GET    | `/target/:targetId` | Required       | None       | Retrieves all ratings associated with a given target ID, e.g., a pet or user. | 200: Ratings fetched successfully with rating data. | 404: No ratings found; 500: Server error. |

### Fetch Likes and Loves by Rescue ID

| Method | Path                      | Authentication | Validation | Description                                                                | Success Response                                    | Error Response                            |
| ------ | ------------------------- | -------------- | ---------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| GET    | `/find-ratings/:rescueId` | Required       | None       | Fetches likes and loves for all pets associated with a specific rescue ID. | 200: Ratings fetched successfully with rating data. | 404: No ratings found; 500: Server error. |

### Find Unrated Pets by User

| Method | Path            | Authentication | Validation | Description                                                            | Success Response                        | Error Response                                 |
| ------ | --------------- | -------------- | ---------- | ---------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| GET    | `/find-unrated` | Required       | None       | Retrieves all pets that have not been rated by the authenticated user. | 200: Unrated pets fetched successfully. | 404: No unrated pets found; 500: Server error. |

### Find Rated Pets by User

| Method | Path          | Authentication | Validation | Description                                                        | Success Response                      | Error Response                               |
| ------ | ------------- | -------------- | ---------- | ------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------- |
| GET    | `/find-rated` | Required       | None       | Retrieves all pets that have been rated by the authenticated user. | 200: Rated pets fetched successfully. | 404: No rated pets found; 500: Server error. |

## Rescue API Documentation

### Get All Rescues

| Method | Path | Input Parameters | Expected Behavior | Expected Output                            |
| ------ | ---- | ---------------- | ----------------- | ------------------------------------------ |
| GET    | `/`  | None             | Fetch all rescues | 200 with list of rescues or 500 on failure |

### Filter Rescues by Type

| Method | Path      | Input Parameters   | Expected Behavior                   | Expected Output                              |
| ------ | --------- | ------------------ | ----------------------------------- | -------------------------------------------- |
| GET    | `/filter` | `type=charity`     | Fetch all rescues of type 'charity' | 200 with list of charities or 500 on failure |
| GET    | `/filter` | `type=invalidType` | Reject non-existent types           | 400 with error message                       |
| GET    | `/filter` | None               | Reject missing type parameter       | 400 with error message                       |

### Get Specific Rescue by ID

| Method | Path   | Input Parameters | Expected Behavior                 | Expected Output                          |
| ------ | ------ | ---------------- | --------------------------------- | ---------------------------------------- |
| GET    | `/:id` | `id=1`           | Fetch specific rescue with ID = 1 | 200 with rescue data or 404 if not found |
| GET    | `/:id` | `id=999`         | Fetch non-existing rescue         | 404 with error message                   |

### Create New Rescue Organization

| Method | Path                                   | Input Parameters                 | Expected Behavior                        | Expected Output        |
| ------ | -------------------------------------- | -------------------------------- | ---------------------------------------- | ---------------------- |
| POST   | `/:type(individual\|charity\|company)` | Correct data for `type=charity`  | Successfully create a new charity rescue | 201 with rescue data   |
| POST   | `/:type(individual\|charity\|company)` | Incorrect data or missing fields | Handle validation errors                 | 400 with error message |
| POST   | `/:type(individual\|charity\|company)` | Existing email address           | Prevent duplicate entries                | 409 with error message |

### Update Rescue Organization

| Method | Path                                          | Input Parameters                                            | Expected Behavior                    | Expected Output               |
| ------ | --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| PUT    | `/:rescueId/:type(charity\|company)/validate` | Correct update for `type=charity` with new reference number | Successfully update a charity rescue | 200 with updated data         |
| PUT    | `/:rescueId/:type(charity\|company)/validate` | Non-existent ID or invalid changes                          | Handle errors and validation issues  | 400 or 404 with error message |

### Update Specific Rescue Information

| Method | Path   | Input Parameters | Expected Behavior                      | Expected Output        |
| ------ | ------ | ---------------- | -------------------------------------- | ---------------------- |
| PUT    | `/:id` | Correct updates  | Successfully update rescue information | 200 with updated data  |
| PUT    | `/:id` | Invalid updates  | Reject updates with invalid data       | 400 with error message |

# Pet Management API Documentation

### Create a New Pet

| Method | Path | Authentication | Validation     | Description                                                | Success Response                             | Error Response                                    |
| ------ | ---- | -------------- | -------------- | ---------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| POST   | `/`  | Required       | `petJoiSchema` | Creates a new pet record. Checks for `add_pet` permission. | 201: Pet created successfully with pet data. | 403: Insufficient permissions; 500: Server error. |

### Get All Pets

| Method | Path | Authentication | Description                | Success Response                              | Error Response     |
| ------ | ---- | -------------- | -------------------------- | --------------------------------------------- | ------------------ |
| GET    | `/`  | Required       | Retrieves all pet records. | 200: Pets fetched successfully with pet data. | 500: Server error. |

### Get Specific Pet by ID

| Method | Path   | Authentication | Description                     | Success Response                             | Error Response                         |
| ------ | ------ | -------------- | ------------------------------- | -------------------------------------------- | -------------------------------------- |
| GET    | `/:id` | Required       | Retrieves a specific pet by ID. | 200: Pet fetched successfully with pet data. | 404: Pet not found; 500: Server error. |

### Get Pets by Owner ID

| Method | Path              | Authentication | Description                                   | Success Response                              | Error Response                         |
| ------ | ----------------- | -------------- | --------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| GET    | `/owner/:ownerId` | Required       | Retrieves all pets owned by a specific owner. | 200: Pets fetched successfully with pet data. | 404: No pets found; 500: Server error. |

### Update Pet Record by ID

| Method | Path   | Authentication | Description                                                      | Success Response                                     | Error Response                                                                                  |
| ------ | ------ | -------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| PUT    | `/:id` | Required       | Updates a specific pet record. Checks for `edit_pet` permission. | 200: Pet updated successfully with updated pet data. | 400: No updatable fields; 403: Insufficient permissions; 404: Pet not found; 500: Server error. |

### Delete Pet Record by ID

| Method | Path   | Authentication | Description                                                        | Success Response               | Error Response                                                        |
| ------ | ------ | -------------- | ------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------- |
| DELETE | `/:id` | Required       | Deletes a specific pet record. Checks for `delete_pet` permission. | 200: Pet deleted successfully. | 403: Insufficient permissions; 404: Pet not found; 500: Server error. |

### Upload Images for Pet

| Method | Path          | Authentication | Description                                                                                   | Success Response                                         | Error Response                                                        |
| ------ | ------------- | -------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| POST   | `/:id/images` | Required       | Uploads images for a specific pet. Supports up to 5 images. Checks for `edit_pet` permission. | 200: Images uploaded successfully with updated pet data. | 403: Insufficient permissions; 404: Pet not found; 500: Server error. |

### Delete Images for Pet

| Method | Path          | Authentication | Description                                                           | Success Response                                        | Error Response                                                                                  |
| ------ | ------------- | -------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| DELETE | `/:id/images` | Required       | Deletes specified images for a pet. Checks for `edit_pet` permission. | 200: Images deleted successfully with updated pet data. | 400: No images specified; 403: Insufficient permissions; 404: Pet not found; 500: Server error. |

## Additional Information

- All endpoints require user authentication.
- Permissions are checked based on user roles defined in the database.
- Errors are logged and reported using Sentry for monitoring.
