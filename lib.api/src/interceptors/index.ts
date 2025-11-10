// Request/Response Interceptors for lib.api
export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

export interface ErrorInterceptor {
  (error: Error): Error | Promise<Error>;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor): number {
    return this.requestInterceptors.push(interceptor) - 1;
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): number {
    return this.responseInterceptors.push(interceptor) - 1;
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): number {
    return this.errorInterceptors.push(interceptor) - 1;
  }

  removeInterceptor(type: 'request' | 'response' | 'error', id: number): void {
    const interceptors = this.getInterceptorArray(type);
    if (interceptors[id]) {
      delete interceptors[id];
    }
  }

  async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let result = config;
    for (const interceptor of this.requestInterceptors) {
      if (interceptor) {
        result = await interceptor(result);
      }
    }
    return result;
  }

  async applyResponseInterceptors(response: Response): Promise<Response> {
    let result = response;
    for (const interceptor of this.responseInterceptors) {
      if (interceptor) {
        result = await interceptor(result);
      }
    }
    return result;
  }

  async applyErrorInterceptors(error: Error): Promise<Error> {
    let result = error;
    for (const interceptor of this.errorInterceptors) {
      if (interceptor) {
        result = await interceptor(result);
      }
    }
    return result;
  }

  private getInterceptorArray(type: 'request' | 'response' | 'error') {
    switch (type) {
      case 'request':
        return this.requestInterceptors;
      case 'response':
        return this.responseInterceptors;
      case 'error':
        return this.errorInterceptors;
      default:
        throw new Error(`Unknown interceptor type: ${type}`);
    }
  }
}
