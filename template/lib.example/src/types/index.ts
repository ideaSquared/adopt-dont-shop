export type ExampleServiceConfig = {
  debug?: boolean;
  apiUrl?: string;
};

export type ExampleResult = {
  success: boolean;
  data: unknown;
  message?: string;
  timestamp: string;
};
