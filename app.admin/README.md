# app.admin - Administrative Dashboard

## Overview

This is the administrative dashboard for the Adopt Don't Shop platform, allowing platform administrators to:

- Manage users and rescue organizations
- Moderate content
- View platform analytics
- Configure system settings
- Handle support requests

## Structure

```
app.admin/
├── src/
│   ├── components/     # Admin-specific components
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

- User management
- Rescue organization verification and management
- Content moderation queue
- System analytics dashboard
- Platform configuration
- Support ticket management
- Audit logging

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

- `/` - Admin dashboard
- `/login` - Admin login
- `/users` - User management
- `/rescues` - Rescue management
- `/moderation` - Content moderation
- `/analytics` - Platform analytics
- `/support` - Support tickets
- `/config` - System configuration
- `/audit` - Audit logs
