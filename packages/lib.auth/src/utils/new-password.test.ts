import { describe, expect, it } from 'vitest';
import { NewPasswordSchema } from './new-password';

const messagesFor = (password: string) => {
  const result = NewPasswordSchema.safeParse(password);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('NewPasswordSchema', () => {
  it('accepts a password meeting the strong policy', () => {
    expect(NewPasswordSchema.safeParse('Str0ng!pass').success).toBe(true);
  });

  it.each([
    ['too short', 'Aa1!aaa', /at least 8/i],
    ['no uppercase letter', 'str0ng!pass', /uppercase/i],
    ['no lowercase letter', 'STR0NG!PASS', /lowercase/i],
    ['no digit', 'Strong!pass', /digit/i],
    ['no special character', 'Str0ngpass1', /special/i],
  ])('rejects a password with %s', (_label, password, message) => {
    expect(messagesFor(password).some((m) => message.test(m))).toBe(true);
  });

  it('rejects a password longer than the gateway accepts (128)', () => {
    const tooLong = `Aa1!${'a'.repeat(125)}`;
    expect(tooLong).toHaveLength(129);
    expect(messagesFor(tooLong).some((m) => /at most 128/i.test(m))).toBe(true);
  });

  it('accepts a password of exactly 128 characters', () => {
    expect(NewPasswordSchema.safeParse(`Aa1!${'a'.repeat(124)}`).success).toBe(true);
  });
});
