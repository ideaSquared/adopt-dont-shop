import { Button, Spinner } from '@adopt-dont-shop/lib.components';
import styled, { keyframes } from 'styled-components';
import { useChat } from '../context/use-chat';
import type { Conversation } from '../types';
import { safeFormatDistanceToNow } from '../utils/date-helpers';

type ConversationWithRescueName = Conversation & { rescueName?: string };

const ConversationContainer = styled.div`
  background: ${(props) => props.theme.background.primary};
  border-right: 1px solid ${(props) => props.theme.border.color.secondary};
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${(props) => props.theme.border.color.secondary};
  }
`;

const Header = styled.div`
  padding: 1.5rem 1.25rem 1rem 1.25rem;
  border-bottom: 1px solid ${(props) => props.theme.border.color.tertiary};
  background: ${(props) => props.theme.background.primary};
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;

  h3 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: ${(props) => props.theme.text.primary};
    letter-spacing: -0.02em;
  }
`;

const HeaderCount = styled.span`
  font-size: 0.8125rem;
  color: ${(props) => props.theme.text.tertiary};
  font-weight: 500;
  font-variant-numeric: tabular-nums;
`;

const ConversationsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
`;

const ConversationItem = styled.button<{ $isActive?: boolean; $hasUnread?: boolean }>`
  display: flex;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition:
    background 0.12s ease,
    transform 0.12s ease;
  background: ${(props) =>
    props.$isActive
      ? props.theme.colors.primary[50]
      : props.$hasUnread
        ? props.theme.background.secondary
        : 'transparent'};
  border: none;
  border-left: 3px solid
    ${(props) => (props.$isActive ? props.theme.colors.primary[500] : 'transparent')};
  border-bottom: 1px solid ${(props) => props.theme.border.color.tertiary};
  color: inherit;
  font: inherit;
  position: relative;

  &:hover {
    background: ${(props) =>
      props.$isActive ? props.theme.colors.primary[100] : props.theme.background.secondary};
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.primary[500]};
    outline-offset: -2px;
  }
`;

const ConversationBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ConversationHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const Avatar = styled.div<{ $hasUnread?: boolean }>`
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.primary[700]};
  background: linear-gradient(
    135deg,
    ${(props) => props.theme.colors.primary[100]},
    ${(props) => props.theme.colors.primary[200]}
  );
  box-shadow: inset 0 0 0 2px ${(props) => props.theme.background.primary};
  position: relative;

  ${(props) =>
    props.$hasUnread &&
    `
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${props.theme.colors.semantic.error[500]};
      box-shadow: 0 0 0 2px ${props.theme.background.primary};
    }
  `}
`;

const RescueName = styled.h4<{ $hasUnread?: boolean }>`
  margin: 0;
  font-size: 0.95rem;
  font-weight: ${(props) => (props.$hasUnread ? 700 : 600)};
  color: ${(props) => props.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
`;

const Timestamp = styled.span<{ $hasUnread?: boolean }>`
  font-size: 0.75rem;
  color: ${(props) =>
    props.$hasUnread ? props.theme.colors.primary[600] : props.theme.text.tertiary};
  font-weight: ${(props) => (props.$hasUnread ? 600 : 500)};
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
`;

const LastMessage = styled.p<{ $hasUnread?: boolean }>`
  margin: 0;
  font-size: 0.8125rem;
  color: ${(props) => (props.$hasUnread ? props.theme.text.primary : props.theme.text.secondary)};
  font-weight: ${(props) => (props.$hasUnread ? 500 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
`;

const PetInfo = styled.div`
  font-size: 0.6875rem;
  color: ${(props) => props.theme.colors.primary[600]};
  margin-top: 0.375rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

/**
 * Pulse ring color is derived from theme.colors.semantic.error[500] at ~55%
 * alpha via CSS color-mix (widely supported since 2023). This keeps the
 * halo tracking the theme's error accent instead of being pinned to a
 * hardcoded red.
 */
const badgePulse = keyframes`
  0% { box-shadow: 0 0 0 0 var(--chat-unread-halo); }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

const UnreadBadge = styled.span`
  --chat-unread-halo: color-mix(
    in srgb,
    ${(props) => props.theme.colors.semantic.error[500]} 55%,
    transparent
  );

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  background: ${(props) => props.theme.colors.semantic.error[500]};
  color: ${(props) => props.theme.text.inverse};
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  flex: 0 0 auto;
  animation: ${badgePulse} 2s ease-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  padding: 3.5rem 2rem;
  text-align: center;
  color: ${(props) => props.theme.text.secondary};

  .illustration {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${(props) => props.theme.text.primary};
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0 0 1.5rem 0;
    font-size: 0.9rem;
    line-height: 1.55;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

const computeInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type ConversationListProps = {
  /**
   * Called after a conversation is selected and the active conversation has
   * been updated in context. Apps that sync URL state (e.g. `/chat/:id`)
   * perform that navigation here. When omitted, only the active conversation
   * in context changes.
   */
  onConversationSelect?: (conversation: Conversation) => void;
  /** Heading for the list. Defaults to "Conversations". */
  title?: string;
  /** Body copy for the empty state. */
  emptyStateDescription?: string;
  /** Optional CTA button shown in the empty state (e.g. "Discover Pets"). */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
};

export function ConversationList({
  onConversationSelect,
  title = 'Conversations',
  emptyStateDescription = 'Start a conversation when you have a matching pet or application to discuss.',
  emptyAction,
}: ConversationListProps) {
  const { conversations, activeConversation, setActiveConversation, isLoading } = useChat();

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
    onConversationSelect?.(conversation);
  };

  const getUnreadCount = (conversation: Conversation) => conversation.unreadCount || 0;

  const totalUnread = (conversations || []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  if (isLoading && (!conversations || conversations.length === 0)) {
    return (
      <ConversationContainer>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </ConversationContainer>
    );
  }

  return (
    <ConversationContainer>
      <Header>
        <h3>{title}</h3>
        {totalUnread > 0 && <HeaderCount>{totalUnread} unread</HeaderCount>}
      </Header>

      {!conversations || conversations.length === 0 ? (
        <EmptyState>
          <div className="illustration" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <h4>No conversations yet</h4>
          <p>{emptyStateDescription}</p>
          {emptyAction && (
            <Button variant="primary" size="md" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </EmptyState>
      ) : (
        <ConversationsList>
          {(conversations || []).map((conversationRaw) => {
            const conversation = conversationRaw as ConversationWithRescueName;
            const unreadCount = getUnreadCount(conversation);
            const isActive = activeConversation?.id === conversation.id;
            const hasUnread = unreadCount > 0 && !isActive;

            let rescueName = '';
            if (conversation.rescueName) {
              rescueName = conversation.rescueName;
            } else if (Array.isArray(conversation.participants)) {
              const rescueParticipant = conversation.participants.find((p) => p.type === 'rescue');
              rescueName = rescueParticipant?.name || '';
            }
            if (!rescueName) {
              rescueName = 'Rescue Organization';
            }

            return (
              <ConversationItem
                key={conversation.id}
                $isActive={isActive}
                $hasUnread={hasUnread}
                onClick={() => handleConversationClick(conversation)}
                aria-label={`${rescueName}${hasUnread ? `, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : ''}`}
              >
                <Avatar $hasUnread={hasUnread}>{computeInitials(rescueName)}</Avatar>
                <ConversationBody>
                  <ConversationHeaderRow>
                    <RescueName $hasUnread={hasUnread}>{rescueName}</RescueName>
                    <Timestamp $hasUnread={hasUnread}>
                      {safeFormatDistanceToNow(conversation.updatedAt, 'just now')}
                    </Timestamp>
                  </ConversationHeaderRow>

                  <BottomRow>
                    {conversation.lastMessage ? (
                      <LastMessage $hasUnread={hasUnread}>
                        {conversation.lastMessage.content}
                      </LastMessage>
                    ) : (
                      <LastMessage $hasUnread={false}>
                        <em>No messages yet</em>
                      </LastMessage>
                    )}
                    {hasUnread && (
                      <UnreadBadge aria-hidden>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </UnreadBadge>
                    )}
                  </BottomRow>

                  {conversation.petId && <PetInfo>Pet #{conversation.petId}</PetInfo>}
                </ConversationBody>
              </ConversationItem>
            );
          })}
        </ConversationsList>
      )}
    </ConversationContainer>
  );
}
