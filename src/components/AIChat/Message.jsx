import React from 'react';
import { formatTimeWithLocale } from '../../utils/dateUtils';
import './Message.css';

const Message = ({ content, sender, timestamp, isError = false }) => {
  const formatTime = (date) => {
    return formatTimeWithLocale(date, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message ${sender} ${isError ? 'error' : ''}`}>
      <div className="message-content">
        <p>{content}</p>
      </div>
      <div className="message-timestamp">
        {formatTime(timestamp)}
      </div>
    </div>
  );
};

export default Message;
