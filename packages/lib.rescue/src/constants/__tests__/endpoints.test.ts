import { RESCUE_ENDPOINTS } from '../endpoints';

describe('RESCUE_ENDPOINTS', () => {
  it('should expose static rescue collection paths', () => {
    expect(RESCUE_ENDPOINTS.RESCUES).toBe('/api/v1/rescues');
    expect(RESCUE_ENDPOINTS.SEARCH_RESCUES).toBe('/api/v1/rescues/search');
    expect(RESCUE_ENDPOINTS.FEATURED_RESCUES).toBe('/api/v1/rescues/featured');
    expect(RESCUE_ENDPOINTS.NEARBY_RESCUES).toBe('/api/v1/rescues/nearby');
    expect(RESCUE_ENDPOINTS.REGISTER_RESCUE).toBe('/api/v1/rescues/register');
    expect(RESCUE_ENDPOINTS.USER_FOLLOWED_RESCUES).toBe('/api/v1/rescues/followed');
  });

  it('should build per-rescue paths from an id', () => {
    expect(RESCUE_ENDPOINTS.RESCUE_BY_ID('x')).toBe('/api/v1/rescues/x');
    expect(RESCUE_ENDPOINTS.VERIFY_RESCUE('x')).toBe('/api/v1/rescues/x/verify');
    expect(RESCUE_ENDPOINTS.UPDATE_PROFILE('x')).toBe('/api/v1/rescues/x/profile');
    expect(RESCUE_ENDPOINTS.UPLOAD_LOGO('x')).toBe('/api/v1/rescues/x/logo');
    expect(RESCUE_ENDPOINTS.UPLOAD_IMAGES('x')).toBe('/api/v1/rescues/x/images');
    expect(RESCUE_ENDPOINTS.RESCUE_STATS('x')).toBe('/api/v1/rescues/x/stats');
    expect(RESCUE_ENDPOINTS.ADOPTION_METRICS('x')).toBe('/api/v1/rescues/x/metrics');
    expect(RESCUE_ENDPOINTS.ADOPTION_POLICIES('x')).toBe('/api/v1/rescues/x/adoption-policies');
    expect(RESCUE_ENDPOINTS.UPDATE_ADOPTION_POLICIES('x')).toBe(
      '/api/v1/rescues/x/adoption-policies'
    );
    expect(RESCUE_ENDPOINTS.RESCUE_REVIEWS('x')).toBe('/api/v1/rescues/x/reviews');
    expect(RESCUE_ENDPOINTS.ADD_REVIEW('x')).toBe('/api/v1/rescues/x/reviews');
    expect(RESCUE_ENDPOINTS.FOLLOW_RESCUE('x')).toBe('/api/v1/rescues/x/follow');
    expect(RESCUE_ENDPOINTS.UNFOLLOW_RESCUE('x')).toBe('/api/v1/rescues/x/follow');
  });
});
