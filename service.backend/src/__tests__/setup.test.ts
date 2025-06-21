describe('Setup Test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should import User model without errors', async () => {
    const User = await import('../models/User');
    expect(User.default).toBeDefined();
  });

  it('should import AuthService without errors', async () => {
    const { AuthService } = await import('../services/auth.service');
    expect(AuthService).toBeDefined();
  });

  it('should import UserService without errors', async () => {
    const { UserService } = await import('../services/user.service');
    expect(UserService).toBeDefined();
  });
});
