# Adopt Don't Shop - Development Guidelines

We follow Test-Driven Development (TDD) with a strong emphasis on behaviour-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state through development.

## Quick Reference

- Write tests first (TDD)
- Test behaviour, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Jest + React Testing Library
- **State Management**: Prefer immutable patterns

---

## Monorepo Architecture

This project is a **Turborepo monorepo** with npm workspaces containing multiple applications and shared libraries.

### Project Structure

```
adopt-dont-shop/
├── app.admin/          # Admin dashboard (React + Vite)
├── app.client/         # Client-facing app (React + Vite)
├── app.rescue/         # Rescue organization app (React + Vite)
├── service.backend/    # API server (Express + Sequelize)
└── lib.*/             # Shared libraries (17 packages)
    ├── lib.analytics
    ├── lib.api
    ├── lib.applications
    ├── lib.auth
    ├── lib.chat
    ├── lib.components
    ├── lib.dev-tools
    ├── lib.discovery
    ├── lib.feature-flags
    ├── lib.invitations
    ├── lib.notifications
    ├── lib.permissions
    ├── lib.pets
    ├── lib.rescue
    ├── lib.search
    ├── lib.utils
    └── lib.validation
```

### Working with Packages

**All packages are scoped under `@adopt-dont-shop/`:**

- Apps: `@adopt-dont-shop/app-*`
- Libraries: `@adopt-dont-shop/lib-*`
- Service: `@adopt-dont-shop/service-backend`

**Key Scripts:**

```bash
# Development
npm run dev                    # Run all packages
npm run dev:apps              # Run all apps only
npm run dev:backend           # Run backend service only
npm run dev:admin             # Run admin app only
npm run dev:lib-auth          # Run specific library

# Testing
npm run test                  # Test all packages
npm run test:libs             # Test all libraries
npm run test:backend          # Test backend only

# Building
npm run build                 # Build all packages
npm run build:libs            # Build libraries first (required!)
npm run build:apps            # Build applications
```

**Important Monorepo Rules:**

1. **Always build libraries before apps** - apps depend on built library artifacts
2. Use `turbo` commands for optimal caching and parallel execution
3. Reference workspace packages with `*` version (e.g., `"@adopt-dont-shop/lib-api": "*"`)
4. Changes to shared libraries affect multiple consumers - test thoroughly
5. Each package has its own `package.json`, `tsconfig.json`, and tests

---

## Testing Principles

### Behaviour-Driven Testing

- **No "unit tests"** - this term is not helpful. Tests should verify expected behaviour, treating implementation as a black box
- Test through public APIs exclusively - internals should be invisible to tests
- No 1:1 mapping between testing files and implementation files
- Tests that examine internal implementation detail are wasteful and should be avoided
- **Coverage targets**: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business behaviour, not implementation details
- Tests must document expected business behaviour

#### Testing Tools

- **Jest** for testing framework
- **React Testing Library** for React components
- **MSW (Mock Service Worker)** for API mocking when needed
- All test code must follow the same TypeScript strict mode rules as production code

### Test Organization

**Backend Service:**

```
service.backend/src/
  __tests__/
    services/
      auth.service.test.ts
      user.service.test.ts
    controllers/
      user.controller.test.ts
    routes/
      user.routes.test.ts
```

**Shared Libraries:**

```
lib.auth/src/
    auth-service.ts
    auth-service.test.ts
```

**React Applications:**

```
app.admin/src/
    components/
        ErrorBoundary.tsx
        ErrorBoundary.test.tsx
    pages/
        Dashboard.tsx
        Dashboard.test.tsx
```

---

## TypeScript Guidelines

### Strict Mode Requirements

- **No `any`** - ever. Use `unknown` if a type is truly unknown
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- **No `@ts-ignore`** or **`@ts-expect-error`** without explicit explanation
- These rules apply to test code as well as production code

### Type Definitions

- **Prefer `type` over `interface`** in all cases
- Use explicit typing where it aids clarity, but leverage inference where appropriate
- Utilize utility types effectively (`Pick`, `Omit`, `Partial`, `Required`, etc.)
- Create domain-specific types (e.g., `UserId`, `RescueId`) for type safety
- Use Zod or any other [Standard Schema](https://standardschema.dev/) compliant schema library to create types, by creating schemas first

### Schema-First Type Definition

**Always define schemas before types:**

```typescript
// Good: Schema-first approach
import { z } from 'zod';

const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
});

type User = z.infer<typeof UserSchema>;

// Bad: Types without validation
type User = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};
```

---

## Code Style

### Functional Programming

- **No data mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **Composition** as the primary mechanism for code reuse
- Avoid heavy FP abstractions (no need for complex monads or pipe/compose patterns)
- Use array methods (`map`, `filter`, `reduce`) over imperative loops

### Code Structure

- **No nested if/else statements** - use early returns, guard clauses, or composition
- **Avoid deep nesting** in general (max 2 levels)
- Keep functions small and focused on a single responsibility
- Prefer flat, readable code over clever abstractions

### Naming Conventions

- **Functions**: `camelCase`, verb-based
- **Types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` for true constants, `camelCase` for configuration
- **Files**: `kebab-case` for all TypeScript files
- **Test files**: `*.test.ts` or `*.spec.ts`

---

## Backend Patterns (Express + Sequelize)

### Architecture: Controllers → Services → Models

```
Request → Controller → Service → Model → Database
                    ↓
                Response
```

**Controllers** (`src/controllers/`):

- Handle HTTP request/response
- Validate input using express-validator
- Call service layer methods
- Return appropriate HTTP status codes
- NO business logic

**Services** (`src/services/`):

- Contain all business logic
- Pure, testable functions
- Handle data transformations
- Orchestrate model interactions
- Throw errors, let middleware handle HTTP responses

**Models** (`src/models/`):

- Define database schema using Sequelize
- Use TypeScript enums for status/type fields
- Define associations
- Add model-level validations
- Use hooks (beforeCreate, beforeUpdate) sparingly

### Controller Pattern

```typescript
// Good: Clean controller
export class UserController {
  static async getUser(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await UserService.getUserById(userId);

      return res.status(200).json({ data: user });
    } catch (error) {
      // Let error middleware handle this
      throw error;
    }
  }
}
```

### Service Pattern

```typescript
// Good: Service with business logic
export class UserService {
  static async getUserById(userId: string): Promise<User> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('User account is suspended');
    }

    return user;
  }
}
```

### Sequelize Model Pattern

```typescript
// Good: Strongly typed model with enums
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

interface UserAttributes {
  userId: string;
  email: string;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  declare userId: string;
  declare email: string;
  declare status: UserStatus;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      defaultValue: UserStatus.ACTIVE,
    },
  },
  { sequelize }
);
```

### Database Migrations

- Migrations in `service.backend/src/migrations/`
- Use sequential numbering: `01-create-users.ts`, `02-add-user-fields.ts`
- NEVER modify existing migrations - create new ones
- Test migrations up AND down
- Include both `up` and `down` methods

### Middleware Patterns

```typescript
// Authentication middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    const decoded = verifyToken(token);
    req.user = await UserService.getUserById(decoded.userId);
    next();
  } catch (error) {
    next(error);
  }
};
```

---

## Frontend Patterns (React + Vite)

### Component Organization

```
app.*/src/
  components/
    layout/          # Layout components (Header, Sidebar, etc.)
    ui/             # Reusable UI components (Button, Card, etc.)
    data/           # Data-display components (DataTable, etc.)
  pages/            # Page-level components (routes)
  contexts/         # React contexts
  hooks/            # Custom hooks
  services/         # API service clients
  types/            # TypeScript type definitions
  utils/            # Utility functions
```

### Component Patterns

**Functional Components Only:**

```typescript
// Good: Functional component with TypeScript
type UserCardProps = {
  userId: string;
  name: string;
  email: string;
  onEdit: (userId: string) => void;
};

export const UserCard = ({ userId, name, email, onEdit }: UserCardProps) => {
  const handleEdit = () => {
    onEdit(userId);
  };

  return (
    <Card>
      <h3>{name}</h3>
      <p>{email}</p>
      <Button onClick={handleEdit}>Edit</Button>
    </Card>
  );
};

// Bad: Class component
class UserCard extends Component<UserCardProps> { ... }
```

### Hooks Patterns

```typescript
// Custom hooks should start with 'use'
export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userService.getUser(userId);
        setUser(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
};
```

### Styled Components

```typescript
// Use styled-components for styling
import styled from 'styled-components';

const Card = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #1d4ed8;
  }
`;
```

### State Management

- **React Query** for server state
- **React Context** for shared UI state
- **Local state** (useState) for component-specific state
- Avoid prop drilling - use context or composition

---

## Error Handling & Async Patterns

### Async/Await Conventions

**Always use try/catch with async/await:**

```typescript
// Good: Proper error handling
async function fetchUser(userId: string): Promise<User> {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    throw error;
  }
}

// Bad: No error handling
async function fetchUser(userId: string): Promise<User> {
  const user = await User.findByPk(userId);
  return user; // What if this fails?
}
```

### Service-Level Error Handling

**Create custom error classes:**

```typescript
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### React Error Boundaries

**Every app should have an ErrorBoundary:**

```typescript
// Wrap your app
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### API Error Handling

```typescript
// Backend: Centralized error middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('API Error', { error, path: req.path });

  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
});
```

### Frontend Error Handling

```typescript
// Use try/catch in service methods
export class UserService {
  async getUser(userId: string): Promise<User> {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('User not found');
      }
      throw new Error('Failed to fetch user');
    }
  }
}
```

---

## API Design Patterns

### RESTful Conventions

```
GET    /api/v1/users              # List users
GET    /api/v1/users/:userId      # Get user
POST   /api/v1/users              # Create user
PUT    /api/v1/users/:userId      # Update user (full)
PATCH  /api/v1/users/:userId      # Update user (partial)
DELETE /api/v1/users/:userId      # Delete user
```

### Request/Response Types

**Define types for all API interactions:**

```typescript
// Request types
type CreateUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

// Response types
type UserResponse = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

type ApiResponse<T> = {
  data: T;
  message?: string;
};

type ApiErrorResponse = {
  error: string;
  details?: string[];
};
```

### Pagination

```typescript
type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

---

## Database Patterns

### Sequelize Migrations

```typescript
// migrations/01-create-users.ts
export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('users', {
      userId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('users', ['email']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('users');
  },
};
```

### Model Associations

```typescript
// Define associations after all models are loaded
User.hasMany(Pet, { foreignKey: 'userId', as: 'pets' });
Pet.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.belongsToMany(Role, { through: 'user_roles' });
Role.belongsToMany(User, { through: 'user_roles' });
```

### Seeders

- Seeders in `service.backend/src/seeders/`
- Use for development and test data
- Should be idempotent (safe to run multiple times)
- Sequential numbering: `01-users.ts`, `02-pets.ts`

---

## Development Workflow

### TDD Process

Follow Red-Green-Refactor strictly:

1. **Red**: Write a failing test for the desired behaviour
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

### Commit Guidelines

- Each commit should represent a complete, working change
- Use conventional commits format:

```
feat: add user invitation system
fix: correct date format in rescue profile
refactor: extract rescue validation logic
test: add edge cases for rescue registration
```

- Include test changes with feature changes in the same commit

### Pull Request Standards

- Every PR must have all tests passing
- All linting and quality checks must pass
- Work in small increments that maintain a working state
- PRs should be focused on a single feature or fix
- Include description of the behaviour change, not implementation details

---

## Working with Claude

### Expectations

When working with the code:

1. **Think deeply and carefully** before making any edits
2. **Understand the full context** of the code and the requirements
3. **Ask clarifying questions** when requirements are ambiguous
4. **Think from first principles** - don't make assumptions
5. **Follow TDD** - always write or modify tests first

### Code Changes

When suggesting or making changes:

- Respect the existing patterns and conventions
- Maintain test coverage for all behaviour changes
- Follow TDD - write or modify tests first
- Keep changes small and incremental
- Ensure all TypeScript strict mode requirements are met
- Provide rationale for significant design decisions

### Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from these guidelines with justification
- Suggest improvements that align with these principles
- When unsure, ask for clarification rather than assuming

### Monorepo Awareness

When working across packages:

- Understand which packages depend on your changes
- Build libraries before testing dependent apps
- Consider the impact on all consuming packages
- Test changes in the context of the full application
- Update shared types consistently across packages
