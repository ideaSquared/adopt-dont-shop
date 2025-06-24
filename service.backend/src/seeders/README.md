# Database Seeders

This directory contains comprehensive database seeders for populating the development environment with realistic test data for the Adopt Don't Shop platform.

## Overview

The seeders create a complete development environment with:

- **RBAC System**: Permissions, roles, and role-permission assignments
- **Users**: Various user types (admins, rescue staff, adopters) with realistic profiles
- **Rescue Organizations**: Multiple rescue centers with different statuses
- **Pets**: Diverse pet profiles with various statuses and detailed information
- **Applications**: Adoption applications in different workflow states
- **Communications**: Chat conversations and messages between users
- **System Data**: Feature flags, notifications, ratings, and email templates

## Quick Start

### Run All Seeders
```bash
npm run seed:dev
```

### Clear All Seeded Data
```bash
npm run seed:clear
```

## Seeder Order

The seeders run in this specific order to maintain referential integrity:

1. **Permissions** (`01-permissions.ts`) - Base permission system
2. **Roles** (`02-roles.ts`) - User roles (admin, rescue_staff, adopter, etc.)
3. **Role-Permissions** (`03-role-permissions.ts`) - Maps permissions to roles
4. **Users** (`04-users.ts`) - Test users with various types
5. **User-Roles** (`05-user-roles.ts`) - Assigns roles to users
6. **Rescues** (`06-rescues.ts`) - Rescue organization profiles
7. **Feature Flags** (`07-feature-flags.ts`) - System feature toggles
8. **Pets** (`08-pets.ts`) - Pet profiles with detailed information
9. **Applications** (`09-applications.ts`) - Adoption applications
10. **Chats** (`10-chats.ts`) - Chat conversations
11. **Messages** (`11-messages.ts`) - Chat messages
12. **Notifications** (`12-notifications.ts`) - User notifications
13. **Ratings** (`13-ratings.ts`) - Reviews and ratings
14. **Email Templates** (`14-email-templates.ts`) - System email templates

## Test Data Created

### Users
- **Super Admin**: `superadmin@adoptdontshop.dev`
- **Admin**: `admin@adoptdontshop.dev`
- **Moderator**: `moderator@adoptdontshop.dev`
- **Rescue Managers**: Various rescue organization administrators
- **Adopters**: Multiple test adopters with different experience levels

**Default Password**: `DevPassword123!`

### Pets
- **Buddy** (Golden Retriever) - Available, high energy
- **Whiskers** (Senior Cat) - Available, special needs
- **Rocky** (Senior Pit Bull Mix) - Available, gentle
- **Luna** (Siamese Mix) - Pending adoption
- **Max** (German Shepherd Mix) - Young, needs training

### Applications
- Various application states (submitted, under review, approved, rejected)
- Realistic application data with references, answers, and notes
- Different adoption scenarios and outcomes

### Rescue Organizations
- **Paws Rescue Austin** (Verified) - General rescue
- **Happy Tails Senior Dog Rescue** (Verified) - Senior dog specialist
- **Furry Friends Portland** (Pending) - Multi-species rescue

## Environment Requirements

Make sure your environment variables are set:

```env
NODE_ENV=development
DEV_DB_NAME=your_dev_database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Individual Seeder Usage

You can also run individual seeders by importing and calling them:

```typescript
import { seedUsers } from './04-users';
import { seedPets } from './08-pets';

// Run specific seeders
await seedUsers();
await seedPets();
```

## Data Relationships

The seeded data maintains realistic relationships:
- Users have appropriate roles and permissions
- Pets belong to rescue organizations
- Applications connect users, pets, and rescues
- Chats relate to applications or general inquiries
- Messages populate chat conversations
- Notifications reflect system activities

## Development Tips

### Testing Different Scenarios
The seeders create data for testing various scenarios:
- **Approved applications** (Whiskers → Emily)
- **Pending applications** (Buddy → John)
- **Interview scheduled** (Rocky → Michael)
- **Rejected applications** (Luna → Jessica)

### User Login Testing
Use any of the seeded user emails with the password `DevPassword123!` to test different user types and permission levels.

### API Testing
The seeded data provides realistic test cases for:
- Pet search and filtering
- Application workflows
- Chat functionality
- Rating systems
- Email template testing

## Adding New Seeders

To add a new seeder:

1. Create a new file: `XX-name.ts`
2. Export a function: `export async function seedName()`
3. Add it to `index.ts` in the seeders array
4. Update the clear order if needed

## Troubleshooting

### Foreign Key Errors
If you get foreign key constraint errors:
1. Run `npm run seed:clear` first
2. Ensure database migrations are up to date
3. Run `npm run seed:dev` again

### Performance
The seeders use `findOrCreate` to avoid duplicates, so they're safe to run multiple times. Initial seeding typically takes 10-30 seconds depending on your database.

## Production Safety

⚠️ **Important**: These seeders are designed for development only. Do not run in production environments. The clear function truncates tables and should never be used with production data. 