/**
 * Accessibility test for AddUserModal — aria-required sweep
 *
 * Extends PR #673 (app.client application form) and PR #674 (lib.components
 * C1-2: TextInput/TextArea/CheckboxInput/SelectInput/FileUpload) by checking
 * native form inputs in app.admin that wrap the lib.components Input
 * primitive. The required prop now flows through to aria-required="true" so
 * assistive tech announces the field as mandatory.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import { AddUserModal } from './AddUserModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onCreate: vi.fn().mockResolvedValue(undefined),
};

describe('AddUserModal aria-required (a11y sweep)', () => {
  it('marks the required First Name input with aria-required="true"', () => {
    render(<AddUserModal {...defaultProps} />);
    const firstName = screen.getByLabelText(/first name/i);
    expect(firstName).toHaveAttribute('aria-required', 'true');
  });

  it('marks the required Last Name input with aria-required="true"', () => {
    render(<AddUserModal {...defaultProps} />);
    const lastName = screen.getByLabelText(/last name/i);
    expect(lastName).toHaveAttribute('aria-required', 'true');
  });

  it('marks the required Email input with aria-required="true"', () => {
    render(<AddUserModal {...defaultProps} />);
    const email = screen.getByLabelText(/^email$/i);
    expect(email).toHaveAttribute('aria-required', 'true');
  });

  it('does not set aria-required on the optional Role select', () => {
    render(<AddUserModal {...defaultProps} />);
    const role = screen.getByLabelText(/role/i);
    expect(role).not.toHaveAttribute('aria-required');
  });
});
