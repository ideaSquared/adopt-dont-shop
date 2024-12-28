const API_BASE_URL = 'http://localhost:5000/api'

interface ApiRequestOptions<Req> {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Req
  requiresAuth?: boolean
}

/**
 * Generic API request function.
 * @template Req - Request body type.
 * @template Res - Response type.
 * @param options - Options for the API request.
 * @returns Promise resolving to response data.
 */
async function apiRequest<Req = undefined, Res = unknown>(
  options: ApiRequestOptions<Req>,
): Promise<Res | void> {
  const { endpoint, method, body, requiresAuth = true } = options

  const headers: HeadersInit = {}

  if (requiresAuth) {
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Only set 'Content-Type' if body is not FormData
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body:
      body instanceof FormData
        ? (body as unknown as BodyInit)
        : JSON.stringify(body),
  })

  if (!response.ok) {
    const errorMessage = await response.text()
    throw new Error(`Error ${response.status}: ${errorMessage}`)
  }

  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<Res>
  }

  return undefined
}

const apiService = {
  /**
   * Generic GET request.
   * @template Res - Response type.
   * @param endpoint - API endpoint.
   * @param requiresAuth - Whether authentication is required.
   * @returns Promise resolving to the response data or undefined.
   */
  get<Res>(endpoint: string, requiresAuth = true): Promise<Res> {
    return apiRequest<undefined, Res>({
      endpoint,
      method: 'GET',
      requiresAuth,
    }) as Promise<Res>
  },

  /**
   * Generic POST request.
   * @template Req - Request body type.
   * @template Res - Response type.
   * @param endpoint - API endpoint.
   * @param body - Request payload.
   * @param requiresAuth - Whether authentication is required.
   * @returns Promise resolving to the response data or undefined.
   */
  post<Req, Res>(
    endpoint: string,
    body: Req,
    requiresAuth = true,
  ): Promise<Res> {
    return apiRequest<Req, Res>({
      endpoint,
      method: 'POST',
      body,
      requiresAuth,
    }) as Promise<Res>
  },

  /**
   * Generic PUT request.
   * @template Req - Request body type.
   * @template Res - Response type.
   * @param endpoint - API endpoint.
   * @param body - Request payload.
   * @param requiresAuth - Whether authentication is required.
   * @returns Promise resolving to the response data or undefined.
   */
  put<Req, Res>(
    endpoint: string,
    body: Req,
    requiresAuth = true,
  ): Promise<Res> {
    return apiRequest<Req, Res>({
      endpoint,
      method: 'PUT',
      body,
      requiresAuth,
    }) as Promise<Res>
  },

  /**
   * Generic DELETE request.
   * @template Res - Response type.
   * @param endpoint - API endpoint.
   * @param requiresAuth - Whether authentication is required.
   * @returns Promise resolving to the response data or undefined.
   */
  delete<Res>(endpoint: string, requiresAuth = true): Promise<Res> {
    return apiRequest<undefined, Res>({
      endpoint,
      method: 'DELETE',
      requiresAuth,
    }) as Promise<Res>
  },
}

export { apiService }
