import React from 'react';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Container = (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />;
export const Card = (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />;
export const Button = (props: React.ComponentPropsWithoutRef<'button'>) => <button {...props} />;
export const Text = (props: React.ComponentPropsWithoutRef<'span'>) => <span {...props} />;
export const Heading = (props: React.ComponentPropsWithoutRef<'h1'>) => <h1 {...props} />;
