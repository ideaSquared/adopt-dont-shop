import {
  EmailSchema,
  LoginRequestSchema,
  PhoneNumberSchema,
  RegisterRequestSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  StrongPasswordSchema,
  UpdateProfileRequestSchema,
  UserStatusSchema,
  UserTypeSchema,
} from '../user';

describe('User schemas', () => {
  describe('EmailSchema', () => {
    it('lowercases and trims valid emails', () => {
      const result = EmailSchema.parse('  Foo@Example.COM  ');
      expect(result).toBe('foo@example.com');
    });

    it('rejects malformed emails', () => {
      expect(() => EmailSchema.parse('not-an-email')).toThrow();
    });

    it('rejects emails over 255 chars', () => {
      const tooLong = 'a'.repeat(251) + '@b.co';
      expect(() => EmailSchema.parse(tooLong)).toThrow();
    });
  });

  describe('StrongPasswordSchema', () => {
    it('accepts a password meeting every rule', () => {
      expect(() => StrongPasswordSchema.parse('Abc123!@')).not.toThrow();
    });

    it.each([
      ['too short', 'Ab1!'],
      ['no uppercase', 'abcdef1!'],
      ['no lowercase', 'ABCDEF1!'],
      ['no digit', 'Abcdefg!'],
      ['no special char', 'Abcdef12'],
    ])('rejects %s', (_label, value) => {
      expect(() => StrongPasswordSchema.parse(value)).toThrow();
    });
  });

  describe('PhoneNumberSchema', () => {
    it('strips separators and keeps 10–20 digit numbers', () => {
      expect(PhoneNumberSchema.parse('+44 (20) 7946-0958')).toBe('+442079460958');
    });

    it('rejects too-short input even after stripping', () => {
      expect(() => PhoneNumberSchema.parse('123-456')).toThrow();
    });
  });

  describe('UserStatusSchema / UserTypeSchema', () => {
    it('accepts the canonical values', () => {
      expect(UserStatusSchema.parse('active')).toBe('active');
      expect(UserTypeSchema.parse('rescue_staff')).toBe('rescue_staff');
    });

    it('rejects unknown values', () => {
      expect(() => UserStatusSchema.parse('archived')).toThrow();
      expect(() => UserTypeSchema.parse('superuser')).toThrow();
    });
  });

  describe('RegisterRequestSchema', () => {
    const valid = {
      email: 'new@user.com',
      password: 'GoodPass1!',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    it('accepts a minimal valid registration', () => {
      const parsed = RegisterRequestSchema.parse(valid);
      expect(parsed.email).toBe('new@user.com');
    });

    it('rejects when password is weak', () => {
      expect(() => RegisterRequestSchema.parse({ ...valid, password: 'weakpass' })).toThrow();
    });

    it('rejects when first name is empty after trim', () => {
      expect(() => RegisterRequestSchema.parse({ ...valid, firstName: '   ' })).toThrow();
    });

    it('accepts an optional userType from the canonical set', () => {
      const parsed = RegisterRequestSchema.parse({ ...valid, userType: 'rescue_staff' });
      expect(parsed.userType).toBe('rescue_staff');
    });
  });

  describe('LoginRequestSchema', () => {
    it('accepts email + non-empty password', () => {
      expect(() =>
        LoginRequestSchema.parse({ email: 'a@b.co', password: 'something' })
      ).not.toThrow();
    });

    it('rejects empty password', () => {
      expect(() => LoginRequestSchema.parse({ email: 'a@b.co', password: '' })).toThrow();
    });

    it('accepts a 6–8 char 2FA token', () => {
      expect(() =>
        LoginRequestSchema.parse({ email: 'a@b.co', password: 'x', twoFactorToken: '123456' })
      ).not.toThrow();
      expect(() =>
        LoginRequestSchema.parse({ email: 'a@b.co', password: 'x', twoFactorToken: '12345' })
      ).toThrow();
    });
  });

  describe('Password-reset schemas', () => {
    it('RequestPasswordResetSchema requires a valid email', () => {
      expect(() => RequestPasswordResetSchema.parse({ email: 'foo' })).toThrow();
      expect(() => RequestPasswordResetSchema.parse({ email: 'foo@bar.co' })).not.toThrow();
    });

    it('ResetPasswordSchema requires a token + strong password', () => {
      expect(() =>
        ResetPasswordSchema.parse({ token: 'abc', newPassword: 'GoodPass1!' })
      ).not.toThrow();
      expect(() => ResetPasswordSchema.parse({ token: '', newPassword: 'GoodPass1!' })).toThrow();
      expect(() => ResetPasswordSchema.parse({ token: 'abc', newPassword: 'weak' })).toThrow();
    });
  });

  describe('UpdateProfileRequestSchema', () => {
    it('accepts a partial update', () => {
      const parsed = UpdateProfileRequestSchema.parse({ bio: 'Hello' });
      expect(parsed.bio).toBe('Hello');
    });

    it('rejects bio longer than 500 chars', () => {
      expect(() => UpdateProfileRequestSchema.parse({ bio: 'x'.repeat(501) })).toThrow();
    });

    it('rejects an invalid profileImageUrl', () => {
      expect(() => UpdateProfileRequestSchema.parse({ profileImageUrl: 'not-a-url' })).toThrow();
    });

    it('coerces dateOfBirth strings into Date', () => {
      const parsed = UpdateProfileRequestSchema.parse({ dateOfBirth: '2000-01-15' });
      expect(parsed.dateOfBirth).toBeInstanceOf(Date);
    });

    it('accepts a nested location block within the limits', () => {
      const parsed = UpdateProfileRequestSchema.parse({
        location: { city: 'London', country: 'GB' },
      });
      expect(parsed.location?.city).toBe('London');
    });
  });
});
