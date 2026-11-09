import { render, screen } from '@testing-library/react';
import React from 'react';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as the level-one heading', () => {
    render(<PageHeader title='Pet management' />);

    expect(screen.getByRole('heading', { level: 1, name: 'Pet management' })).toBeInTheDocument();
  });

  it('renders the description when given', () => {
    render(<PageHeader title='Users' description='Manage accounts and roles' />);

    expect(screen.getByText('Manage accounts and roles')).toBeInTheDocument();
  });

  it('renders actions alongside the title', () => {
    render(<PageHeader title='Users' actions={<button type='button'>Add user</button>} />);

    expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
  });

  it('omits the description and actions when not given', () => {
    render(<PageHeader title='Users' />);

    expect(screen.queryByText('Manage accounts and roles')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('merges a custom className and test id', () => {
    render(<PageHeader title='Users' className='extra' data-testid='page-header' />);

    expect(screen.getByTestId('page-header')).toHaveClass('extra');
  });
});
