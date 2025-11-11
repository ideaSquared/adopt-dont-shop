/**
 * Mock for @adopt-dont-shop/lib-auth
 */

import { ReactNode } from 'react';

export const AuthLayout = ({ children }: { children: ReactNode }) => <div>{children}</div>;
export const LoginForm = () => <div>LoginForm Mock</div>;
export const RegisterForm = () => <div>RegisterForm Mock</div>;
export const ForgotPasswordForm = () => <div>ForgotPasswordForm Mock</div>;
export const ResetPasswordForm = () => <div>ResetPasswordForm Mock</div>;

export const useAuth = jest.fn(() => ({
  isAuthenticated: false,
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}));
