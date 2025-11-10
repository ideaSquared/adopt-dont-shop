#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Template configurations
const TEMPLATES = {
  minimal: {
    name: 'Minimal',
    description: 'Basic React app with auth and routing',
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.8.1',
      '@adopt-dont-shop/components': '*',
      '@adopt-dont-shop/lib-auth': '*',
      'styled-components': '^6.1.8',
    },
    contexts: ['Auth'],
    features: ['DevLogin', 'Basic Routing', 'Styled Components'],
  },
  standard: {
    name: 'Standard',
    description: 'Full-featured app with data fetching and analytics',
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.8.1',
      '@adopt-dont-shop/components': '*',
      '@adopt-dont-shop/lib-auth': '*',
      '@adopt-dont-shop/lib-analytics': '*',
      '@adopt-dont-shop/lib-api': '*',
      'react-query': '^3.39.3',
      'styled-components': '^6.1.8',
    },
    contexts: ['Auth', 'Analytics'],
    features: ['DevLogin', 'React Query', 'API Service', 'Analytics', 'Error Boundaries'],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Complete enterprise app with all features',
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.8.1',
      '@adopt-dont-shop/components': '*',
      '@adopt-dont-shop/lib-auth': '*',
      '@adopt-dont-shop/lib-analytics': '*',
      '@adopt-dont-shop/lib-api': '*',
      '@adopt-dont-shop/lib-feature-flags': '*',
      '@adopt-dont-shop/lib-notifications': '*',
      '@adopt-dont-shop/lib-permissions': '*',
      '@adopt-dont-shop/lib-discovery': '*',
      '@adopt-dont-shop/lib-search': '*',
      '@statsig/react-bindings': '^3.18.2',
      'react-query': '^3.39.3',
      'styled-components': '^6.1.8',
    },
    contexts: ['Auth', 'Analytics', 'FeatureFlags', 'Notifications', 'Permissions'],
    features: [
      'DevLogin',
      'React Query',
      'API Service',
      'Feature Flags',
      'Notifications',
      'Permissions',
      'A/B Testing',
    ],
  },
};

/**
 * Utility function to log colored messages
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Utility function to create directories if they don't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`📁 Created directory: ${path.relative(ROOT_DIR, dirPath)}`, 'cyan');
  }
}

/**
 * Utility function to write files with logging
 */
function writeFile(filePath, content) {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  log(`📄 Created file: ${path.relative(ROOT_DIR, filePath)}`, 'green');
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  let appName = null;
  let template = 'standard'; // Default to standard template
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && i + 1 < args.length) {
      template = args[i + 1];
      i++; // Skip the next argument as it's the template value
    } else if (args[i] === '--overwrite') {
      overwrite = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    } else if (!appName) {
      appName = args[i];
    } else if (appName && !args[i].startsWith('--')) {
      // If we have an app name and this doesn't start with --, it's likely a template
      template = args[i];
    }
  }

  return { appName, template, overwrite };
}

/**
 * Show help information
 */
function showHelp() {
  log('🚀 @adopt-dont-shop App Generator', 'bright');
  log('', 'reset');
  log('Usage:', 'cyan');
  log('  npm run new-app <app-name> [--template <template>]', 'yellow');
  log('', 'reset');
  log('Templates:', 'cyan');
  Object.keys(TEMPLATES).forEach(key => {
    const template = TEMPLATES[key];
    log(`  ${key.padEnd(12)} - ${template.description}`, 'reset');
  });
  log('', 'reset');
  log('Examples:', 'cyan');
  log('  npm run new-app app.dashboard', 'yellow');
  log('  npm run new-app app.admin --template enterprise', 'yellow');
  log('  npm run new-app app.simple --template minimal', 'yellow');
  log('', 'reset');
  log('Features by template:', 'cyan');
  Object.keys(TEMPLATES).forEach(key => {
    const template = TEMPLATES[key];
    log(`  ${template.name}:`, 'bright');
    template.features.forEach(feature => {
      log(`    ✓ ${feature}`, 'green');
    });
    log('', 'reset');
  });
}

/**
 * Generate package.json for React app with template-specific dependencies
 */
function generatePackageJson(appName, template) {
  const packageName = `@adopt-dont-shop/${appName}`;
  const templateConfig = TEMPLATES[template];

  return JSON.stringify(
    {
      name: packageName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        'lint:fix': 'eslint src --ext ts,tsx --fix',
        'type-check': 'tsc --noEmit',
      },
      dependencies: templateConfig.dependencies,
      devDependencies: {
        '@types/jest': '^29.4.0',
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        eslint: '^8.45.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.3',
        'identity-obj-proxy': '^3.0.0',
        jest: '^29.4.0',
        'jest-environment-jsdom': '^29.4.0',
        'jest-transform-stub': '^2.0.0',
        'ts-jest': '^29.1.0',
        typescript: '^5.0.2',
        vite: '^5.4.10',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        '@testing-library/user-event': '^14.0.0',
      },
    },
    null,
    2
  );
}

/**
 * Generate main.tsx based on template
 */
function generateMain(template) {
  const templateConfig = TEMPLATES[template];

  let imports = [
    "import { ThemeProvider } from '@adopt-dont-shop/components';",
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import { BrowserRouter } from 'react-router-dom';",
    "import App from './App';",
    "import { AuthProvider } from '@/contexts/AuthContext';",
  ];

  let queryClientSetup = '';
  let providers = [
    '<AuthProvider>',
    '  <ThemeProvider>',
    '    <BrowserRouter>',
    '      <App />',
    '    </BrowserRouter>',
    '  </ThemeProvider>',
    '</AuthProvider>',
  ];

  if (template === 'standard' || template === 'enterprise') {
    imports.push("import { QueryClient, QueryClientProvider } from 'react-query';");

    queryClientSetup = `const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

`;

    providers = [
      '<QueryClientProvider client={queryClient}>',
      '  <AuthProvider>',
      '    <ThemeProvider>',
      '      <BrowserRouter>',
      '        <App />',
      '      </BrowserRouter>',
      '    </ThemeProvider>',
      '  </AuthProvider>',
      '</QueryClientProvider>',
    ];
  }

  if (template === 'enterprise') {
    imports.push("import { StatsigWrapper } from '@/contexts/StatsigContext';");

    providers = [
      '<StatsigWrapper>',
      '  <QueryClientProvider client={queryClient}>',
      '    <AuthProvider>',
      '      <ThemeProvider>',
      '        <BrowserRouter>',
      '          <App />',
      '        </BrowserRouter>',
      '      </ThemeProvider>',
      '    </AuthProvider>',
      '  </QueryClientProvider>',
      '</StatsigWrapper>',
    ];
  }

  return `${imports.join('\n')}

${queryClientSetup}ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    ${providers.join('\n    ')}
  </React.StrictMode>
);`;
}

/**
 * Generate App.tsx based on template
 */
function generateApp(template) {
  const templateConfig = TEMPLATES[template];

  let imports = [
    "import { Route, Routes } from 'react-router-dom';",
    "import { HomePage } from '@/pages/HomePage';",
    "import { DevLoginPanel } from '@/components/dev/DevLoginPanel';",
    "import { Footer } from '@adopt-dont-shop/components';",
  ];

  let providers = ['<div className="app">'];
  let content = [
    '  <main>',
    '    <Routes>',
    '      <Route path="/" element={<HomePage />} />',
    '    </Routes>',
    '  </main>',
    '  <DevLoginPanel />',
    '  <Footer />',
    '</div>',
  ];

  if (template === 'standard' || template === 'enterprise') {
    imports.push("import { AnalyticsProvider } from '@/contexts/AnalyticsContext';");
    providers = ['<AnalyticsProvider>', '  <div className="app">'];
    content.push('  </div>');
    content.push('</AnalyticsProvider>');
  }

  if (template === 'enterprise') {
    imports.push("import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';");
    imports.push("import { NotificationsProvider } from '@/contexts/NotificationsContext';");
    imports.push("import { PermissionsProvider } from '@/contexts/PermissionsContext';");

    providers = [
      '<PermissionsProvider>',
      '  <FeatureFlagsProvider>',
      '    <NotificationsProvider>',
      '      <AnalyticsProvider>',
      '        <div className="app">',
    ];

    content = [
      '          <main>',
      '            <Routes>',
      '              <Route path="/" element={<HomePage />} />',
      '            </Routes>',
      '          </main>',
      '          <DevLoginPanel />',
      '          <Footer />',
      '        </div>',
      '      </AnalyticsProvider>',
      '    </NotificationsProvider>',
      '  </FeatureFlagsProvider>',
      '</PermissionsProvider>',
    ];
  }

  return `${imports.join('\n')}

function App() {
  return (
    ${providers.join('\n    ')}
${content.join('\n')}
  );
}

export default App;`;
}

/**
 * Generate AuthContext
 */
function generateAuthContext() {
  return `import { AuthService, User, LoginRequest } from '@adopt-dont-shop/lib-auth';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setDevUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authService = new AuthService();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const setDevUser = (devUser: User) => {
    setUser(devUser);
    // Create a mock token for dev mode
    localStorage.setItem('authToken', \`dev-token-\${devUser.email}\`);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      setDevUser,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};`;
}

/**
 * Generate DevLoginPanel
 */
function generateDevLoginPanel() {
  return `import { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { User, RescueRole } from '@adopt-dont-shop/lib-auth';

const DevPanel = styled.div\`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 8px;
  z-index: 1000;
  min-width: 250px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    position: relative;
    top: auto;
    right: auto;
    margin: 16px;
    width: calc(100% - 32px);
  }
\`;

const DevButton = styled.button\`
  background: #007acc;
  color: white;
  border: none;
  padding: 8px 12px;
  margin: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  
  &:hover {
    background: #005a9e;
  }
\`;

const DevTitle = styled.h4\`
  margin: 0 0 12px 0;
  color: #00ff88;
  font-size: 14px;
\`;

const UserInfo = styled.div\`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 11px;
\`;

// Seeded development users
const seededDevUsers: User[] = [
  {
    userId: 'dev-admin',
    email: 'admin@dev.local',
    firstName: 'Admin',
    lastName: 'User',
    emailVerified: true,
    userType: 'admin',
    status: 'active',
    role: RescueRole.RESCUE_ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-staff', 
    email: 'staff@dev.local',
    firstName: 'Staff',
    lastName: 'User',
    emailVerified: true,
    userType: 'rescue_staff',
    status: 'active',
    role: RescueRole.RESCUE_STAFF,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-volunteer',
    email: 'volunteer@dev.local', 
    firstName: 'Volunteer',
    lastName: 'User',
    emailVerified: true,
    userType: 'rescue_staff',
    status: 'active',
    role: RescueRole.RESCUE_VOLUNTEER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-adopter',
    email: 'adopter@dev.local',
    firstName: 'Potential',
    lastName: 'Adopter',
    emailVerified: true,
    userType: 'adopter',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DevLoginPanel = () => {
  const { user, logout, setDevUser } = useAuth();
  const [isVisible, setIsVisible] = useState(import.meta.env.NODE_ENV === 'development');

  if (!isVisible || import.meta.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleUserLogin = (devUser: User) => {
    setDevUser(devUser);
  };

  return (
    <DevPanel>
      <DevTitle>🔧 Dev Login</DevTitle>
      
      {user ? (
        <UserInfo>
          <div>👤 {user.firstName} {user.lastName}</div>
          <div>📧 {user.email}</div>
          <div>🎭 {user.role}</div>
          <DevButton onClick={logout}>Logout</DevButton>
        </UserInfo>
      ) : (
        <div>
          {seededDevUsers.map((devUser) => (
            <DevButton
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              title={\`Login as \${devUser.firstName} \${devUser.lastName} (\${devUser.role})\`}
            >
              {devUser.firstName} {devUser.lastName}
            </DevButton>
          ))}
        </div>
      )}
      
      <DevButton 
        onClick={() => setIsVisible(false)}
        style={{ marginTop: '8px', background: '#666' }}
      >
        Hide
      </DevButton>
    </DevPanel>
  );
};`;
}

/**
 * Generate HomePage
 */
function generateHomePage(appName, template) {
  const templateConfig = TEMPLATES[template];

  return `import styled from 'styled-components';

const Container = styled.div\`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
\`;

const Hero = styled.section\`
  text-align: center;
  padding: 4rem 0;
\`;

const Title = styled.h1\`
  font-size: 3rem;
  color: #333;
  margin-bottom: 1rem;
\`;

const Subtitle = styled.p\`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
\`;

const FeaturesGrid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
\`;

const FeatureCard = styled.div\`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
\`;

const FeatureIcon = styled.div\`
  font-size: 2rem;
  margin-bottom: 1rem;
\`;

const FeatureTitle = styled.h3\`
  color: #333;
  margin-bottom: 1rem;
\`;

const FeatureDescription = styled.p\`
  color: #666;
  font-size: 0.9rem;
\`;

const TemplateInfo = styled.div\`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  text-align: center;
\`;

export const HomePage = () => {
  return (
    <Container>
      <Hero>
        <Title>Welcome to ${appName}</Title>
        <Subtitle>Your new React application is ready!</Subtitle>
        
        <TemplateInfo>
          <strong>Template:</strong> ${templateConfig.name} - ${templateConfig.description}
        </TemplateInfo>
      </Hero>

      <FeaturesGrid>
        {${JSON.stringify(templateConfig.features)}.map((feature, index) => (
          <FeatureCard key={index}>
            <FeatureIcon>✨</FeatureIcon>
            <FeatureTitle>{feature}</FeatureTitle>
            <FeatureDescription>
              {feature} is ready to use in your application.
            </FeatureDescription>
          </FeatureCard>
        ))}
      </FeaturesGrid>
    </Container>
  );
};`;
}

/**
 * Generate context files based on template
 */
function generateContextFiles(appDir, template) {
  const contextsDir = path.join(appDir, 'src', 'contexts');

  // Always generate AuthContext
  writeFile(path.join(contextsDir, 'AuthContext.tsx'), generateAuthContext());

  if (template === 'standard' || template === 'enterprise') {
    // Generate AnalyticsContext
    writeFile(path.join(contextsDir, 'AnalyticsContext.tsx'), generateAnalyticsContext());
  }

  if (template === 'enterprise') {
    // Generate all enterprise contexts
    writeFile(path.join(contextsDir, 'FeatureFlagsContext.tsx'), generateFeatureFlagsContext());
    writeFile(path.join(contextsDir, 'NotificationsContext.tsx'), generateNotificationsContext());
    writeFile(path.join(contextsDir, 'PermissionsContext.tsx'), generatePermissionsContext());
    writeFile(path.join(contextsDir, 'StatsigContext.tsx'), generateStatsigContext());
  }
}

/**
 * Generate AnalyticsContext
 */
function generateAnalyticsContext() {
  return `import { AnalyticsService, UserEngagementEvent, PageViewEvent } from '@adopt-dont-shop/lib-analytics';
import { createContext, useContext, ReactNode, useMemo } from 'react';

interface AnalyticsContextType {
  analyticsService: AnalyticsService;
  trackEvent: (event: UserEngagementEvent) => void;
  trackPageView: (url: string, title?: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const analyticsService = useMemo(() => {
    return new AnalyticsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      provider: 'internal',
      autoTrackPageViews: true,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const trackEvent = (event: UserEngagementEvent) => {
    analyticsService.trackEvent(event);
  };

  const trackPageView = (url: string, title?: string) => {
    const pageViewEvent: Omit<PageViewEvent, 'sessionId' | 'timestamp'> = {
      url,
      title: title || document.title,
    };
    analyticsService.trackPageView(pageViewEvent);
  };

  const value = useMemo(() => ({
    analyticsService,
    trackEvent,
    trackPageView,
  }), [analyticsService]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};`;
}

/**
 * Generate simplified contexts for enterprise template
 */
function generateFeatureFlagsContext() {
  return `import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';
import { createContext, useContext, ReactNode, useMemo, useState } from 'react';

interface FeatureFlagsContextType {
  featureFlagsService: FeatureFlagsService;
  isFeatureEnabled: (flag: string) => Promise<boolean>;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
};

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export const FeatureFlagsProvider = ({ children }: FeatureFlagsProviderProps) => {
  const [isLoading] = useState(false);
  
  const featureFlagsService = useMemo(() => {
    return new FeatureFlagsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const isFeatureEnabled = async (flag: string): Promise<boolean> => {
    // Simplified implementation - can be enhanced when APIs are finalized
    console.log(\`Feature flag \${flag} checked - defaulting to false\`);
    return false;
  };

  const value = useMemo(() => ({
    featureFlagsService,
    isFeatureEnabled,
    isLoading,
  }), [featureFlagsService, isLoading]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};`;
}

function generateNotificationsContext() {
  return `import { NotificationsService, Notification } from '@adopt-dont-shop/lib-notifications';
import { createContext, useContext, ReactNode, useMemo, useState } from 'react';

interface NotificationsContextType {
  notificationsService: NotificationsService;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  isLoading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider = ({ children }: NotificationsProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading] = useState(false);
  
  const notificationsService = useMemo(() => {
    return new NotificationsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    // Simplified implementation
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
  };

  const value = useMemo(() => ({
    notificationsService,
    notifications,
    unreadCount,
    markAsRead,
    isLoading,
  }), [notificationsService, notifications, unreadCount, isLoading]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};`;
}

function generatePermissionsContext() {
  return `import { PermissionsService, Permission, UserRole } from '@adopt-dont-shop/lib-permissions';
import { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

interface PermissionsContextType {
  permissionsService: PermissionsService;
  userPermissions: Permission[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

interface PermissionsProviderProps {
  children: ReactNode;
}

export const PermissionsProvider = ({ children }: PermissionsProviderProps) => {
  const { user } = useAuth();
  const [userPermissions] = useState<Permission[]>([]);
  const [isLoading] = useState(false);
  
  const permissionsService = useMemo(() => {
    return new PermissionsService({
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission as Permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const value = useMemo(() => ({
    permissionsService,
    userPermissions,
    hasPermission,
    hasRole,
    isLoading,
  }), [permissionsService, userPermissions, isLoading, user?.role]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};`;
}

function generateStatsigContext() {
  return `import { createContext, useContext, ReactNode } from 'react';
import { StatsigProvider } from '@statsig/react-bindings';

interface StatsigContextType {
  checkGate: (gateName: string) => boolean;
  getConfig: (configName: string) => any;
  logEvent: (eventName: string, value?: any, metadata?: Record<string, any>) => void;
}

const StatsigContext = createContext<StatsigContextType | null>(null);

export const useStatsigInternal = () => {
  const context = useContext(StatsigContext);
  if (!context) {
    throw new Error('useStatsigInternal must be used within StatsigWrapper');
  }
  return context;
};

interface StatsigWrapperProps {
  children: ReactNode;
}

export const StatsigWrapper = ({ children }: StatsigWrapperProps) => {
  const sdkKey = import.meta.env.VITE_STATSIG_CLIENT_KEY || 'client-dev-key';
  const user = {
    userID: 'app-user',
    email: 'user@app.com',
    custom: {
      app: 'generated-app'
    }
  };

  return (
    <StatsigProvider sdkKey={sdkKey} user={user}>
      <StatsigInnerWrapper>
        {children}
      </StatsigInnerWrapper>
    </StatsigProvider>
  );
};

interface StatsigInnerWrapperProps {
  children: ReactNode;
}

const StatsigInnerWrapper = ({ children }: StatsigInnerWrapperProps) => {
  const value: StatsigContextType = {
    checkGate: () => false,
    getConfig: () => ({}),
    logEvent: () => {},
  };

  return (
    <StatsigContext.Provider value={value}>
      {children}
    </StatsigContext.Provider>
  );
};`;
}

/**
 * Generate other necessary files
 */
function generateTsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
        types: ['vite/client'],
      },
      include: ['src', 'vite-env.d.ts'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
      references: [{ path: './tsconfig.node.json' }],
    },
    null,
    2
  );
}

function generateTsConfigNode() {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    },
    null,
    2
  );
}

function generateViteEnvTypes() {
  return `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_STATSIG_CLIENT_KEY: string
  readonly NODE_ENV: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}`;
}

function generateViteConfig() {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
  },
});`;
}

function generateEnvironmentFile() {
  return `# Environment Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=Generated App
VITE_STATSIG_CLIENT_KEY=client-dev-key

# Development Settings
NODE_ENV=development`;
}

/**
 * Main function to create new app with template support
 */
async function createNewApp() {
  try {
    const { appName, template, overwrite } = parseArguments();

    if (!appName) {
      log('❌ Error: Please provide an app name', 'red');
      showHelp();
      process.exit(1);
    }

    // Validate app name format
    if (!appName.match(/^app\.[a-z]+(-[a-z]+)*$/)) {
      log(
        '❌ Error: App name must be in format "app.name" (e.g., app.dashboard, app.user-portal)',
        'red'
      );
      process.exit(1);
    }

    // Validate template
    if (!TEMPLATES[template]) {
      log(`❌ Error: Unknown template "${template}"`, 'red');
      log('Available templates:', 'yellow');
      Object.keys(TEMPLATES).forEach(key => {
        log(`  - ${key}`, 'reset');
      });
      process.exit(1);
    }

    const templateConfig = TEMPLATES[template];
    const appDir = path.join(ROOT_DIR, appName);

    // Check if app already exists
    if (fs.existsSync(appDir) && !overwrite) {
      log(`❌ Error: App "${appName}" already exists. Use --overwrite to replace it.`, 'red');
      process.exit(1);
    }

    // Remove existing directory if overwriting
    if (fs.existsSync(appDir) && overwrite) {
      fs.rmSync(appDir, { recursive: true, force: true });
      log(`🗑️ Removed existing app: ${appName}`, 'yellow');
    }

    // Check if app already exists
    if (fs.existsSync(appDir)) {
      log(`❌ Error: App "${appName}" already exists`, 'red');
      process.exit(1);
    }

    log(`🚀 Creating new React app: ${appName}`, 'bright');
    log(`📋 Template: ${templateConfig.name} - ${templateConfig.description}`, 'cyan');
    log('', 'reset');

    // Create app directory structure
    ensureDirectoryExists(appDir);
    ensureDirectoryExists(path.join(appDir, 'src'));
    ensureDirectoryExists(path.join(appDir, 'src', 'components'));
    ensureDirectoryExists(path.join(appDir, 'src', 'components', 'dev'));
    ensureDirectoryExists(path.join(appDir, 'src', 'pages'));
    ensureDirectoryExists(path.join(appDir, 'src', 'contexts'));
    ensureDirectoryExists(path.join(appDir, 'src', 'hooks'));
    ensureDirectoryExists(path.join(appDir, 'src', 'services'));
    ensureDirectoryExists(path.join(appDir, 'src', 'utils'));
    ensureDirectoryExists(path.join(appDir, 'src', 'types'));
    ensureDirectoryExists(path.join(appDir, 'src', 'test-utils'));
    ensureDirectoryExists(path.join(appDir, 'src', '__tests__'));
    ensureDirectoryExists(path.join(appDir, 'public'));

    // Generate and write files
    log('📝 Generating configuration files...', 'blue');
    writeFile(path.join(appDir, 'package.json'), generatePackageJson(appName, template));
    writeFile(path.join(appDir, 'tsconfig.json'), generateTsConfig());
    writeFile(path.join(appDir, 'tsconfig.node.json'), generateTsConfigNode());
    writeFile(path.join(appDir, 'vite.config.ts'), generateViteConfig());
    writeFile(path.join(appDir, 'vite-env.d.ts'), generateViteEnvTypes());
    writeFile(path.join(appDir, '.env.development'), generateEnvironmentFile());

    log('📝 Generating source files...', 'blue');
    writeFile(path.join(appDir, 'src', 'main.tsx'), generateMain(template));
    writeFile(path.join(appDir, 'src', 'App.tsx'), generateApp(template));
    writeFile(
      path.join(appDir, 'src', 'pages', 'HomePage.tsx'),
      generateHomePage(appName, template)
    );
    writeFile(
      path.join(appDir, 'src', 'components', 'dev', 'DevLoginPanel.tsx'),
      generateDevLoginPanel()
    );

    // Generate context files based on template
    generateContextFiles(appDir, template);

    // Generate HTML
    writeFile(
      path.join(appDir, 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
    );

    // Update workspace package.json to include the new app
    try {
      const workspacePackagePath = path.join(ROOT_DIR, 'package.json');
      const workspacePackage = JSON.parse(fs.readFileSync(workspacePackagePath, 'utf8'));

      if (workspacePackage.workspaces && !workspacePackage.workspaces.includes(appName)) {
        workspacePackage.workspaces.push(appName);
        workspacePackage.workspaces.sort();
        fs.writeFileSync(workspacePackagePath, JSON.stringify(workspacePackage, null, 2));
        log(`📄 Updated workspace package.json to include ${appName}`, 'green');
      }
    } catch (error) {
      log(`⚠️  Warning: Could not update workspace package.json: ${error.message}`, 'yellow');
    }

    log('', 'reset');
    log('🎉 Success!', 'green');
    log(`✨ Created React app: ${appName}`, 'bright');
    log(`📋 Template: ${templateConfig.name}`, 'cyan');
    log('', 'reset');
    log('🚀 Features included:', 'cyan');
    templateConfig.features.forEach(feature => {
      log(`   ✓ ${feature}`, 'green');
    });
    log('', 'reset');
    log('📋 Next steps:', 'cyan');
    log(`   cd ${appName}`, 'reset');
    log(`   npm install`, 'reset');
    log(`   npm run dev`, 'reset');
    log('', 'reset');
  } catch (error) {
    log('❌ Error creating app:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the script
createNewApp();
