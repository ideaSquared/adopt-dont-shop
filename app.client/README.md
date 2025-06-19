# app.client - Public-Facing Application

## Overview

This is the main public-facing application for Adopt Don't Shop, allowing users to:

- Browse pets available for adoption
- Apply to adopt pets
- Manage their adoption applications
- Communicate with rescue organizations
- Create and manage user profiles

## Structure

```
app.client/
├── src/
│   ├── components/     # App-specific components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── api/            # API integration
│   ├── store/          # State management
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main App component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Features

- Pet search and filtering
- Pet details and gallery
- Application submission and tracking
- User authentication
- User profile management
- Messaging with rescues
- Notification system

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build
```

## Testing

```bash
npm run test
```

## Routes

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/pets` - Pet search
- `/pets/:id` - Pet details
- `/apply/:petId` - Adoption application
- `/applications` - Application list
- `/applications/:id` - Application details
- `/profile` - User profile
- `/messages` - Messaging center
