import { AnalyticsService, UserEngagementEvent, PageViewEvent } from '@adopt-dont-shop/lib-analytics';
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
      apiUrl: import.meta.env.VITE_API_URL,
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
};
