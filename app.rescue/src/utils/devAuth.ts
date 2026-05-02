/**
 * Development authentication utilities
 * This follows the same pattern as app.client for dev token handling
 */

/**
 * Create a dev user token and store it in localStorage
 * This creates mock tokens that trigger special handling in the API service
 */
export function setDevUserToken(user: {
  userId: string;
  email: string;
  userType?: string;
}): string {
  // Create mock dev token (same pattern as app.client)
  const mockToken = `dev-token-${user.userId}-${Date.now()}`;

  // In dev mode, tokens are still cookie-based. Log for diagnostics only.
  console.log('🔧 Dev token generated (cookie-based auth):', mockToken);

  return mockToken;
}
