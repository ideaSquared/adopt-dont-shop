import React from 'react';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Container = ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => (
  <div {...props}>{children}</div>
);
export const Card = ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => (
  <div {...props}>{children}</div>
);
export const Button = ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) => (
  <button {...props}>{children}</button>
);
export const Text = ({ children, ...props }: React.ComponentPropsWithoutRef<'span'>) => (
  <span {...props}>{children}</span>
);
export const Heading = ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
  <h1 {...props}>{children}</h1>
);
