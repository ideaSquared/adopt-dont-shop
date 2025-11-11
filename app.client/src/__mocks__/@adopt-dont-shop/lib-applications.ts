export class ApplicationsService {
  constructor(_apiService?: any, _config?: any) {}
  getApplications = jest.fn(() => Promise.resolve([]));
  getApplication = jest.fn(() => Promise.resolve(null));
  submitApplication = jest.fn(() => Promise.resolve({}));
  updateApplication = jest.fn(() => Promise.resolve({}));
  withdrawApplication = jest.fn(() => Promise.resolve());
}

export const applicationsService = new ApplicationsService();
