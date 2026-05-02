import { useChat } from '@/contexts/ChatContext';
import { ChatWindow, ConversationList } from '@adopt-dont-shop/lib.chat';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import * as styles from './Communication.css';

function Communication() {
  const { activeConversation } = useChat();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const showChat = isMobile && activeConversation !== null;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Communication</h1>
        <p>Manage conversations with potential adopters</p>
      </div>

      <div className={styles.chatContainer}>
        {isMobile ? (
          <div
            className={clsx(
              styles.mobileView,
              showChat ? styles.mobileViewShowChat : styles.mobileViewHideChat
            )}
          >
            <ConversationList />
            <ChatWindow />
          </div>
        ) : (
          <>
            <ConversationList />
            <ChatWindow />
          </>
        )}
      </div>
    </div>
  );
}

export default Communication;
