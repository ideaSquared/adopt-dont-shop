import React, { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface Conversation {
  conversation_id: string;
  sender_id: string;
  pet_id: string;
  status: string;
  pet_name: string;
  last_message: string;
  last_message_by: string;
  last_message_at: string;
  unread_messages: number;
  first_name: string;
  rescue_name: string;
}

interface ConversationsComponentProps {
  conversations: Conversation[];
  title: string;
  onConversationSelect: (conversation: Conversation) => void;
  selectedConversation: Conversation | null;
  userType: 'User' | 'Rescue';
  listOfStaffIds: string[];
}

const ConversationsComponent: React.FC<ConversationsComponentProps> = ({
  conversations,
  title,
  onConversationSelect,
  selectedConversation,
  userType,
  listOfStaffIds,
}) => {
  const { authState } = useAuth();
  const userId = authState.userId;

  useEffect(() => {}, [conversations, userType]);

  const formatIsoDateString = (isoDateString: string): string => {
    if (!isoDateString) return 'Date not available';
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    }).format(date);
  };

  const getParticipantName = (conversation: Conversation): string => {
    return conversation.first_name || conversation.rescue_name || 'Unknown';
  };

  const sortedConversations = conversations.sort((a, b) => {
    const dateA = new Date(a.last_message_at);
    const dateB = new Date(b.last_message_at);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className='flex-grow mb-3 overflow-y-auto'>
      <div className='bg-indigo-600 text-white p-4'>
        <span className='text-lg font-semibold'>{title}</span>
      </div>
      <ul className='divide-y divide-gray-200'>
        {sortedConversations.map((conversation) => (
          <li
            key={conversation.conversation_id}
            onClick={() => {
              if (conversation.status !== 'closed') {
                onConversationSelect(conversation);
              }
            }}
            className={`flex items-center justify-between p-4 ${
              conversation.conversation_id === selectedConversation?.conversation_id
                ? 'bg-indigo-100 text-indigo-900'
                : conversation.status === 'closed'
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white hover:bg-gray-50'
            } cursor-pointer ${
              conversation.status === 'closed' ? 'opacity-60 cursor-not-allowed' : ''
            } transition-colors duration-200 ease-in-out`}
          >
            <div className='flex-grow truncate'>
              <div className='font-bold truncate'>
                {getParticipantName(conversation)} for {conversation.pet_name}
              </div>
              <div className='text-sm text-gray-600 truncate'>
                {conversation.last_message}
              </div>
            </div>
            <div className='flex-shrink-0 text-right ml-4'>
              {conversation.last_message_by !== userId &&
                (userType === 'Rescue' ||
                  !listOfStaffIds.includes(conversation.last_message_by)) &&
                conversation.unread_messages > 0 && (
                  <div className='mb-2'>
                    <span className='bg-red-600 rounded-full px-2 py-1 text-xs text-white'>
                      {conversation.unread_messages}
                    </span>
                  </div>
                )}

              <small className='text-gray-500'>
                {formatIsoDateString(conversation.last_message_at)}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConversationsComponent;
