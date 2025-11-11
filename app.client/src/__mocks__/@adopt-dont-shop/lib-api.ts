export class ApiService {
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
  patch = jest.fn();
  updateConfig = jest.fn();
  getConfig = jest.fn(() => ({ apiUrl: 'http://localhost:5000', debug: true }));
}

export const apiService = new ApiService();
export const api = apiService;

export const API_PATHS = {};
export const buildApiPath = jest.fn();
