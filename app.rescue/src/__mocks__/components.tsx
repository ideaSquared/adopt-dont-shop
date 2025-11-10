import React from 'react';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Container = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Card = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
export const Heading = ({ children, ...props }: any) => <h1 {...props}>{children}</h1>;
