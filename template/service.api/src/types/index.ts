export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
};

export type HealthStatus = {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
};
