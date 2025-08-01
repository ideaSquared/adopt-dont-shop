import React from 'react';
import { render, screen } from '../test-utils';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  // TODO: Add your component tests here
});
