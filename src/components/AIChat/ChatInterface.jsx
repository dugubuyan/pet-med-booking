import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Message from './Message';
import MessageInput from './MessageInput';
import './ChatInterface.css';

const ChatInterface = ({ messages, isLoading, onSendMessage, error }) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Limit to last 10 messages for display
  const MAX_VISIBLE_MESSAGES = 10;
  const visibleMessages = messages.slice(-MAX_VISIBLE_MESSAGES);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="chat-interface">
      <div 
        className="messages-container" 
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-label={t('aiChat.title')}
      >
        {messages.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>{t('aiChat.title')}</h3>
            <p>{t('aiChat.subtitle')}</p>
          </div>
        )}
        
        {messages.length > MAX_VISIBLE_MESSAGES && (
          <div className="message-limit-notice" style={{
            textAlign: 'center',
            padding: '8px',
            fontSize: '12px',
            color: '#666',
            background: '#f0f0f0',
            borderRadius: '4px',
            margin: '8px 0'
          }}>
            Showing last {MAX_VISIBLE_MESSAGES} messages of {messages.length}
          </div>
        )}
        
        {visibleMessages.map((msg, index) => (
          <Message
            key={messages.length - MAX_VISIBLE_MESSAGES + index}
            content={msg.content}
            sender={msg.sender}
            timestamp={msg.timestamp}
            isError={msg.isError}
          />
        ))}
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="loading-text">{t('aiChat.thinking')}</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}
      
      <MessageInput 
        onSendMessage={onSendMessage} 
        disabled={isLoading}
      />
    </div>
  );
};

export default ChatInterface;
