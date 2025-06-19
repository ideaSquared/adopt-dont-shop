# app.rescue - Rescue Organization Dashboard

## Overview

This application provides rescue organizations with tools to:

- Manage their pet listings
- Process adoption applications
- Communicate with adopters
- Manage staff accounts and permissions
- Track adoption statistics
- Configure organization settings

## Structure

```
app.rescue/
├── src/
│   ├── components/     # Rescue-specific components
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

- Pet management (add, edit, update status)
- Photo management for pets
- Application processing workflow
- Staff management
- Messaging center
- Analytics and reporting
- Organization profile settings
- Custom application question configuration

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

- `/` - Rescue dashboard
- `/login` - Rescue login
- `/pets` - Pet management
- `/pets/new` - Add new pet
- `/pets/:id` - Edit pet
- `/applications` - Application management
- `/applications/:id` - Application details
- `/staff` - Staff management
- `/messages` - Messaging center
- `/analytics` - Rescue analytics
- `/settings` - Organization settings
- `/questions` - Application question configuration
