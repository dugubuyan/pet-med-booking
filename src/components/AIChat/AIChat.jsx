import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatInterface from './ChatInterface';
import apiService from '../../services/apiService';
import { authService } from '../../services/authService';
import './AIChat.css';

const AIChat = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBookingId, setCurrentBookingId] = useState(null);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    // Try to retrieve existing session from localStorage
    const storedSessionId = localStorage.getItem('chatSessionId');
    
    if (storedSessionId) {
      setSessionId(storedSessionId);
      await loadConversationHistory(storedSessionId);
    } else {
      // Create new session when entering chat page
      await createNewSession();
    }
  };

  const createNewSession = async () => {
    try {
      console.log('Creating new chat session...');
      const response = await apiService.createChatSession(i18n.language);
      
      if (response.success && response.sessionId) {
        console.log('Session created:', response.sessionId);
        setSessionId(response.sessionId);
        localStorage.setItem('chatSessionId', response.sessionId);
        
        // Send initial greeting
        await sendInitialGreeting(response.sessionId);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(t('aiChat.errorTitle'));
    }
  };

  const loadConversationHistory = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await apiService.getConversation(sessionId);
      
      if (response && response.success && response.messages && response.messages.length > 0) {
        // Transform messages to match UI format
        const formattedMessages = response.messages.map(msg => ({
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
        setError(null);
      } else {
        // If no history found, send initial greeting
        await sendInitialGreeting();
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
      // If loading fails, start fresh
      await sendInitialGreeting();
    } finally {
      setIsLoading(false);
    }
  };

  const sendInitialGreeting = async (currentSessionId) => {
    // Get user context if logged in
    const user = authService.getCurrentUser();
    const userContext = getUserContext(user);
    
    try {
      setIsLoading(true);
      const response = await apiService.sendChatMessage(
        'hello', // Send initial greeting message
        currentSessionId || sessionId,
        userContext,
        i18n.language
      );
      
      const assistantMessage = {
        content: response.response,
        sender: 'assistant',
        timestamp: new Date(response.timestamp)
      };
      
      setMessages([assistantMessage]);
      setError(null);
    } catch (err) {
      console.error('Failed to get initial greeting:', err);
      setError(t('aiChat.errorTitle'));
    } finally {
      setIsLoading(false);
    }
  };

  const getUserContext = (user) => {
    if (!user) {
      return {
        userId: null,
        isGuest: true,
        ownerInfo: {},
        petInfo: {},
        features: {
          canBookAppointment: true  // Always allow booking in chat
        }
      };
    }

    const context = {
      userId: user.id,
      isGuest: false,
      ownerInfo: {
        name: user.fullName,
        phone: user.phone,
        email: user.email
      },
      petInfo: {},
      features: {
        canBookAppointment: true  // Always allow booking in chat
      }
    };

    // Add all available pets
    if (user.pets && user.pets.length > 0) {
      context.petInfo.availablePets = user.pets.map(pet => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        age: pet.age,
        breed: pet.breed,
        weight: pet.weight
      }));
      
      // Note: In AIChat, we don't set a specific currentPet
      // The AI will ask which pet the user wants to discuss
    }

    return context;
  };

  const handleSendMessage = async (messageContent) => {
    // Add user message to UI immediately
    const userMessage = {
      content: messageContent,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      const userContext = getUserContext(user);
      
      console.log('🌐 Sending message with language:', i18n.language);
      console.log('📝 Message:', messageContent);
      
      const response = await apiService.sendChatMessage(
        messageContent,
        sessionId,
        userContext,
        i18n.language
      );
      
      const assistantMessage = {
        content: response.response,
        sender: 'assistant',
        timestamp: new Date(response.timestamp)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update session ID if it changed
      if (response.sessionId && response.sessionId !== sessionId) {
        setSessionId(response.sessionId);
        localStorage.setItem('chatSessionId', response.sessionId);
      }

      // If appointment was booked, store the bookingId
      if (response.appointmentBooked && response.bookingId) {
        console.log('✅ Appointment booked! BookingId:', response.bookingId);
        setCurrentBookingId(response.bookingId);
        
        // Add a helpful system message
        const systemMessage = {
          content: `✅ Your appointment has been successfully booked! You can now click the "📋 View Results" button at the top to see your complete appointment details, or continue chatting if you have more questions.`,
          sender: 'assistant',
          timestamp: new Date(),
          isSystem: true
        };
        setMessages(prev => [...prev, systemMessage]);
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      
      let errorMessage = t('aiChat.errorTitle');
      
      if (err.message.includes('Network')) {
        errorMessage = t('aiChat.networkError');
      } else if (err.message.includes('backend')) {
        errorMessage = t('aiChat.configError');
      }
      
      setError(errorMessage);
      
      // Add error message to chat
      const errorMsg = {
        content: errorMessage,
        sender: 'assistant',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async () => {
    localStorage.removeItem('chatSessionId');
    setMessages([]);
    setSessionId(null);
    setCurrentBookingId(null);
    await createNewSession();
  };

  const viewAppointmentResults = () => {
    if (currentBookingId) {
      navigate(`/results?bookingId=${currentBookingId}`);
    } else {
      alert('No appointment has been booked yet in this conversation.');
    }
  };

  return (
    <div className="ai-chat-page">
      <div className="ai-chat-header">
        <button 
          className="back-button"
          onClick={() => navigate('/')}
          aria-label={t('aiChat.backToHome')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="header-content">
          <h1>{t('aiChat.title')}</h1>
          <p>{t('aiChat.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentBookingId && (
            <button 
              className="view-results-button"
              onClick={viewAppointmentResults}
              aria-label="View Appointment Results"
              style={{
                padding: '8px 16px',
                background: '#52c41a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📋 View Results
            </button>
          )}
          <button 
            className="new-chat-button"
            onClick={startNewChat}
            aria-label={t('aiChat.startNewChat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="ai-chat-container">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          error={error}
        />
      </div>
    </div>
  );
};

export default AIChat;
