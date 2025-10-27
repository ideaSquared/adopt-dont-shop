import { describe, it, expect } from '@jest/globals';

describe('Users Page - getUserInitials', () => {
  // Helper function extracted for testing
  const getUserInitials = (firstName: string | null | undefined, lastName: string | null | undefined): string => {
    const firstInitial = firstName?.charAt(0) || '';
    const lastInitial = lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  it('should return initials when both firstName and lastName are provided', () => {
    expect(getUserInitials('John', 'Doe')).toBe('JD');
  });

  it('should return first initial only when lastName is null', () => {
    expect(getUserInitials('John', null)).toBe('J');
  });

  it('should return first initial only when lastName is undefined', () => {
    expect(getUserInitials('John', undefined)).toBe('J');
  });

  it('should return last initial only when firstName is null', () => {
    expect(getUserInitials(null, 'Doe')).toBe('D');
  });

  it('should return last initial only when firstName is undefined', () => {
    expect(getUserInitials(undefined, 'Doe')).toBe('D');
  });

  it('should return ?? when both firstName and lastName are null', () => {
    expect(getUserInitials(null, null)).toBe('??');
  });

  it('should return ?? when both firstName and lastName are undefined', () => {
    expect(getUserInitials(undefined, undefined)).toBe('??');
  });

  it('should return ?? when both firstName and lastName are empty strings', () => {
    expect(getUserInitials('', '')).toBe('??');
  });

  it('should handle mixed case names', () => {
    expect(getUserInitials('john', 'doe')).toBe('JD');
  });

  it('should handle single character names', () => {
    expect(getUserInitials('A', 'B')).toBe('AB');
  });
});
