import { clsx, type ClassValue } from 'clsx';

/**
 * A utility function that combines multiple class names into a single string.
 * Uses clsx to handle conditional classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
