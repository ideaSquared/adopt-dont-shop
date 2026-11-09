import { screen } from '@testing-library/react';
import { ChatWindow } from '../ChatWindow';
import {
  buildChatContextValue,
  buildTestConversation,
  renderWithChatContext,
} from '../../test-utils';

const PET_ID = '9ff53898-c5c6-4422-a245-54e52d4c4b78';

describe('ChatWindow header', () => {
  // jsdom has no layout, so it does not implement scrollIntoView.
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('links to the pet by name instead of showing its id', () => {
    renderWithChatContext(<ChatWindow />, {
      value: buildChatContextValue({
        activeConversation: buildTestConversation({
          rescueName: 'Paws Rescue',
          petId: PET_ID,
          petName: 'Buddy',
        }),
      }),
    });

    expect(screen.getByRole('link', { name: 'Buddy' })).toHaveAttribute('href', `/pets/${PET_ID}`);
    expect(screen.queryByText(new RegExp(PET_ID))).not.toBeInTheDocument();
  });

  it('still links to the pet when its name could not be resolved', () => {
    renderWithChatContext(<ChatWindow />, {
      value: buildChatContextValue({
        activeConversation: buildTestConversation({ rescueName: 'Paws Rescue', petId: PET_ID }),
      }),
    });

    expect(screen.getByRole('link', { name: 'this pet' })).toHaveAttribute(
      'href',
      `/pets/${PET_ID}`
    );
  });

  it('describes a conversation with no pet as general', () => {
    renderWithChatContext(<ChatWindow />, {
      value: buildChatContextValue({
        activeConversation: buildTestConversation({ rescueName: 'Paws Rescue' }),
      }),
    });

    expect(screen.getByText('General conversation')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
