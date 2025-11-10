import React from 'react';
import { render } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    // Simple test just to verify the component can be imported
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  // TODO: Add your component tests here
});
