/**
 * Mock providers for testing
 * These provide minimal implementations to avoid complex dependencies in tests
 */

import { ReactNode } from 'react';

// Mock PermissionsProvider
export const PermissionsProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

// Mock AnalyticsProvider
export const AnalyticsProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

// Mock NotificationsProvider
export const NotificationsProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

// Mock ChatProvider
export const ChatProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

// Mock FavoritesProvider
export const FavoritesProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
