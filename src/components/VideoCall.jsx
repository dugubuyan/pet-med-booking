import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Progress,
  Divider,
  message,
  Row,
  Col,
  Tooltip,
  Switch,
  Image,
  Select,
} from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  StopOutlined,
  CameraOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  SendOutlined,
  AudioMutedOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import apiService from '../services/apiService';
import { authService } from '../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;

const VideoCall = () => {
  const { t, i18n } = useTranslation();
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [transcription, setTranscription] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isListeningStable, setIsListeningStable] = useState(false); // Stable state for UI (prevents flickering)
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false); // User's preference for speech recognition
  
  // AI Chat states
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false); // Start disabled to avoid browser blocking
  const [speechInitialized, setSpeechInitialized] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(null); // Track selected pet
  const [currentUser, setCurrentUser] = useState(null); // Store user in state
  const [currentBookingId, setCurrentBookingId] = useState(null); // Track booking ID for current session
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const speechRecognitionEnabledRef = useRef(false);
  const sessionIdRef = useRef(null);
  const selectedPetIdRef = useRef(null); // Ref to track selected pet ID for closures
  const chatEndRef = useRef(null);
  const synthRef = useRef(null);
  const listeningTimeoutRef = useRef(null); // For debouncing listening state
  const isRestartingRef = useRef(false); // Prevent multiple restart attempts
  const isSpeakingRef = useRef(false); // Track if speech synthesis is active
  const textareaRef = useRef(null); // For auto-resizing textarea
  const navigate = useNavigate();

  useEffect(() => {
    // Get user
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    
    // Get selected pet from localStorage (set by HomePage)
    const bookingData = localStorage.getItem('currentBooking');
    let selectedPet = null;
    
    if (bookingData) {
      const booking = JSON.parse(bookingData);
      
      // Find the pet by name from the booking
      if (user && user.pets) {
        selectedPet = user.pets.find(p => p.name === booking.petName);
        if (selectedPet) {
          console.log('Selected pet for consultation:', selectedPet.name);
        }
      }
    }
    
    // Set the selected pet ID
    if (selectedPet) {
      setSelectedPetId(selectedPet.id);
      selectedPetIdRef.current = selectedPet.id;
    } else if (user && user.pets && user.pets.length > 0) {
      // Fallback to first pet if no booking data
      setSelectedPetId(user.pets[0].id);
      selectedPetIdRef.current = user.pets[0].id;
    }
    
    // Create session when entering video call page
    createSession();
    
    // Initialize AI chat session
    initializeAISession();
    
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices (some browsers need this)
      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        console.log('Speech synthesis initialized with', voices.length, 'voices');
      };
      
      synthRef.current.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
    
    // Helper function to get recognition language from i18n
    const getRecognitionLanguage = (i18nLang) => {
      const langMap = {
        'en': 'en-US',
        'zh': 'zh-CN',
        'sv': 'sv-SE'
      };
      return langMap[i18nLang] || 'en-US';
    };
    
    // Initialize speech recognition (but don't start automatically)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = getRecognitionLanguage(i18n.language);

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript && finalTranscript.trim()) {
          // Add transcript to chat input instead of auto-sending
          setChatInput(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        // Silently handle common errors that don't need user notification
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        
        // Only log and show significant errors
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'network') {
          message.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        // Keep stable state true to prevent flickering
        if (speechRecognitionEnabledRef.current) {
          setIsListeningStable(true);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        
        // Don't auto-restart if speech synthesis is active or user disabled it
        if (isSpeakingRef.current || !speechRecognitionEnabledRef.current) {
          if (!speechRecognitionEnabledRef.current) {
            setIsListeningStable(false);
          }
          return;
        }
        
        // Auto-restart with debounce to prevent rapid restarts
        setTimeout(() => {
          if (recognitionRef.current && speechRecognitionEnabledRef.current && !isSpeakingRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Silently handle restart errors (likely already started)
              if (err.message && !err.message.includes('already started')) {
                console.error('Error restarting speech recognition:', err);
              }
            }
          }
        }, 300);
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      stopVideoCall();
      
      // Clear listening timeout
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      
      // Stop any ongoing speech
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Sync sessionId to ref for closure access
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    selectedPetIdRef.current = selectedPetId;
  }, [selectedPetId]);

  useEffect(() => {
    // Auto-scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [chatInput]);

  // Language change listener for speech recognition
  useEffect(() => {
    const getRecognitionLanguage = (i18nLang) => {
      const langMap = {
        'en': 'en-US',
        'zh': 'zh-CN',
        'sv': 'sv-SE'
      };
      return langMap[i18nLang] || 'en-US';
    };

    const handleLanguageChange = (lng) => {
      if (recognitionRef.current) {
        const newLang = getRecognitionLanguage(lng);
        recognitionRef.current.lang = newLang;
        
        // Restart if currently listening
        if (isListening && speechRecognitionEnabledRef.current) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (recognitionRef.current && speechRecognitionEnabledRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  // Silently handle restart errors
                }
              }
            }, 300);
          } catch (error) {
            // Silently handle stop errors
          }
        }
      }
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [isListening, i18n]);

  const createSession = async () => {
    try {
      console.log('Creating new chat session...');
      const response = await apiService.createChatSession(i18n.language);
      
      if (response.success && response.sessionId) {
        console.log('Session created:', response.sessionId);
        setSessionId(response.sessionId);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      // Continue anyway - session will be created on first message
    }
  };

  const initializeAISession = () => {
    // Show initial greeting immediately (no API call needed)
    const user = authService.getCurrentUser();
    const currentPetId = selectedPetIdRef.current;
    const currentLang = i18n.language;
    
    // Language-specific greetings
    const greetings = {
      en: {
        withPet: (name, petName) => `Hello ${name}! I'm here to help with ${petName}'s health. What brings you in today?`,
        withUser: (name) => `Hello ${name}! I'm here to help with your pet's health. What brings you in today?`,
        guest: "Hello! I'm here to help with your pet's health. What brings you in today?"
      },
      zh: {
        withPet: (name, petName) => `您好 ${name}！我在这里帮助您解决 ${petName} 的健康问题。您今天有什么担心的吗？`,
        withUser: (name) => `您好 ${name}！我在这里帮助您解决宠物的健康问题。您今天有什么担心的吗？`,
        guest: "您好！我是您的AI宠物健康助手。您的宠物有什么不适吗？"
      },
      sv: {
        withPet: (name, petName) => `Hej ${name}! Jag är här för att hjälpa till med ${petName}s hälsa. Vad oroar dig idag?`,
        withUser: (name) => `Hej ${name}! Jag är här för att hjälpa till med ditt husdjurs hälsa. Vad oroar dig idag?`,
        guest: "Hej! Jag är din AI-assistent för husdjurshälsa. Vad bekymrar ditt husdjur?"
      }
    };
    
    const langGreetings = greetings[currentLang] || greetings.en;
    
    let greeting;
    
    if (user && user.pets && user.pets.length > 0 && currentPetId) {
      const selectedPet = user.pets.find(p => p.id === currentPetId);
      
      if (selectedPet) {
        greeting = langGreetings.withPet(user.fullName, selectedPet.name);
      } else {
        greeting = langGreetings.withUser(user.fullName);
      }
    } else if (user) {
      greeting = langGreetings.withUser(user.fullName);
    } else {
      greeting = langGreetings.guest;
    }
    
    setMessages([{
      content: greeting,
      sender: 'assistant',
      timestamp: new Date()
    }]);
  };

  const speakText = (text) => {
    if (!synthRef.current || !speechEnabled) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    // Stop speech recognition to prevent recognizing synthesized speech
    const wasListening = speechRecognitionEnabledRef.current;
    if (wasListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped before synthesis');
      } catch (error) {
        console.error('Error stopping recognition before synthesis:', error);
      }
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Better language mapping
    const langMap = {
      'en': 'en-US',
      'zh': 'zh-CN',
      'sv': 'sv-SE'
    };
    utterance.lang = langMap[i18n.language] || 'en-US';
    
    // Try to find a voice for the language
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(i18n.language));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log('Using voice:', preferredVoice.name, 'for language:', i18n.language);
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Restart speech recognition if it was active before
      if (wasListening && recognitionRef.current && speechRecognitionEnabledRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (error) {
            // Silently handle restart errors
          }
        }, 300);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Restart speech recognition even on error if it was active before
      if (wasListening && recognitionRef.current && speechRecognitionEnabledRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (error) {
            // Silently handle restart errors
          }
        }, 300);
      }
    };
    
    synthRef.current.speak(utterance);
  };

  const toggleSpeech = () => {
    const newState = !speechEnabled;
    setSpeechEnabled(newState);
    
    if (!newState && synthRef.current) {
      // Disabling speech - cancel any ongoing speech
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else if (newState && !speechInitialized) {
      // First time enabling - initialize with a test utterance
      setSpeechInitialized(true);
      if (synthRef.current) {
        // Speak a short welcome to initialize
        const testUtterance = new SpeechSynthesisUtterance('Speech enabled');
        testUtterance.volume = 0.5;
        synthRef.current.speak(testUtterance);
      }
    }
    
    message.success(newState ? t('videoCall.speechEnabled') : t('videoCall.speechDisabled'));
  };

  const sendMessageToAI = async (messageText) => {
    if (!messageText.trim() || isAILoading) {
      return;
    }

    const userMessage = {
      content: messageText.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsAILoading(true);

    try {
      const user = authService.getCurrentUser();
      const userContext = getUserContext(user);
      
      // Use ref to get current sessionId value
      const currentSessionId = sessionIdRef.current;
      
      const response = await apiService.sendChatMessage(
        messageText.trim(),
        currentSessionId,
        userContext,
        i18n.language
      );
      
      if (response.sessionId && response.sessionId !== currentSessionId) {
        console.log('Received new sessionId from backend:', response.sessionId);
        setSessionId(response.sessionId);
        sessionIdRef.current = response.sessionId;
      }
      
      const assistantMessage = {
        content: response.response,
        sender: 'assistant',
        timestamp: new Date(response.timestamp)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      speakText(response.response);
      
      // If appointment was booked, store the bookingId in state
      if (response.appointmentBooked && response.bookingId) {
        console.log('✅ Appointment booked in VideoCall! BookingId:', response.bookingId);
        setCurrentBookingId(response.bookingId);
        message.success(`Appointment booked! ID: ${response.bookingId}`);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      
      const errorMsg = {
        content: "I'm sorry, I'm having trouble connecting right now. Please try again.",
        sender: 'assistant',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAILoading(false);
    }
  };

  const getUserContext = (user) => {
    // Use ref to get current value, avoiding stale closure
    const currentPetId = selectedPetIdRef.current;
    
    if (!user) {
      return {
        userId: null,
        isGuest: true,
        ownerInfo: {},
        petInfo: {},
        features: {
          canBookAppointment: true,
          hasImageCapture: capturedImages.length > 0,
          imageCount: capturedImages.length
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
        canBookAppointment: true,
        hasImageCapture: capturedImages.length > 0,
        imageCount: capturedImages.length
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
      
      // Use selected pet as current pet if available (use ref value)
      const selectedPet = user.pets.find(p => p.id === currentPetId);
      
      if (selectedPet) {
        context.petInfo.currentPet = {
          id: selectedPet.id,
          name: selectedPet.name,
          type: selectedPet.type,
          age: selectedPet.age,
          breed: selectedPet.breed,
          weight: selectedPet.weight
        };
        console.log('Consultation context - Pet:', selectedPet.name, 'Owner:', user.fullName);
      }
    }

    return context;
  };

  const handleSendAIMessage = async () => {
    console.log('handleSendAIMessage called, chatInput:', chatInput);
    
    if (!chatInput.trim() || isAILoading) {
      console.log('Returning early - empty input or loading');
      return;
    }

    const messageText = chatInput.trim();
    setChatInput(''); // Clear input immediately
    
    await sendMessageToAI(messageText);
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsVideoActive(true);
      
      // Start automatic image capture every 20 seconds
      captureIntervalRef.current = setInterval(() => {
        console.log('Auto-capturing image...');
        captureImage();
      }, 20000);
      
      message.success(t('videoCall.videoStarted'));
    } catch (error) {
      console.error('Error accessing camera:', error);
      message.error(t('videoCall.cameraAccessFailed'));
    }
  };

  const stopVideoCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsVideoActive(false);
    setIsRecording(false);
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      message.warning(t('videoCall.speechRecognitionNotSupported'));
      return;
    }

    const newState = !speechRecognitionEnabled;
    setSpeechRecognitionEnabled(newState);
    speechRecognitionEnabledRef.current = newState;

    if (newState) {
      // Enable speech recognition
      try {
        recognitionRef.current.start();
        console.log('Speech recognition enabled');
        message.success(t('videoCall.speechRecognitionStarted'));
        setIsListeningStable(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        message.error(t('videoCall.speechRecognitionFailed'));
        setSpeechRecognitionEnabled(false);
        speechRecognitionEnabledRef.current = false;
        setIsListeningStable(false);
      }
    } else {
      // Disable speech recognition
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition disabled');
        message.info(t('videoCall.voiceInputDisabled'));
        setIsListeningStable(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  };

  const startRecording = () => {
    console.log('startRecording called, isVideoActive:', isVideoActive);
    
    if (!isVideoActive) {
      message.warning(t('videoCall.startVideoFirst'));
      return;
    }

    console.log('Setting isRecording to true');
    setIsRecording(true);
    setSessionDuration(0);
    
    // Start session timer
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration(prev => {
        console.log('Session duration:', prev + 1);
        return prev + 1;
      });
    }, 1000);

    // Start automatic image capture every 20 seconds
    captureIntervalRef.current = setInterval(() => {
      console.log('Auto-capturing image...');
      captureImage();
    }, 20000);

    message.success(t('videoCall.recordingStarted'));
    console.log('Recording started successfully');
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    message.success(t('videoCall.recordingStopped'));
  };

  const captureImage = () => {
    if (!videoRef.current || !isVideoActive) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const timestamp = new Date().toISOString();
    
    const newImage = {
      id: Date.now(),
      data: imageData,
      timestamp,
      filename: `pet-capture-${Date.now()}.jpg`
    };
    
    setCapturedImages(prev => [...prev, newImage]);
    message.info(t('videoCall.imageCaptured', { time: new Date(timestamp).toLocaleTimeString() }));
  };

  const endConsultation = () => {
    // Stop speech recognition
    if (recognitionRef.current && speechRecognitionEnabled) {
      try {
        setSpeechRecognitionEnabled(false);
        speechRecognitionEnabledRef.current = false;
        recognitionRef.current.stop();
        console.log('Speech recognition stopped on consultation end');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    stopRecording();
    stopVideoCall();
    
    // Compile AI conversation summary
    const aiConversation = messages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.content)
      .join(' ');
    
    // Save session data
    const sessionData = {
      capturedImages,
      transcription: aiConversation || transcription,
      sessionDuration,
      endTime: new Date().toISOString(),
      aiMessages: messages,
      sessionId
    };
    
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
    message.success(t('videoCall.consultationCompleted'));
    
    setTimeout(() => {
      // Navigate to results with bookingId if available
      if (currentBookingId) {
        navigate(`/results?bookingId=${currentBookingId}`);
      } else {
        // No appointment was booked, show message
        message.info('Session completed. No appointment was booked.');
        navigate('/');
      }
    }, 1500);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-container">
      <div className="video-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          {t('videoCall.title')}
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {t('videoCall.subtitle')}
        </Text>
      </div>

      <div className="video-content">
        <Alert
          message={t('videoCall.alertTitle')}
          description={
            <div>
              <p style={{ marginBottom: '8px' }}><strong>{t('videoCall.howToStart')}</strong></p>
              <ol style={{ marginBottom: '8px', paddingLeft: '20px' }}>
                <li>{t('videoCall.step1')}</li>
                <li>{t('videoCall.step2')}</li>
                <li>{t('videoCall.step3')}</li>
                <li>{t('videoCall.step4')}</li>
              </ol>
              <p style={{ marginBottom: '8px' }}><strong>{t('videoCall.features')}</strong></p>
              <ul style={{ marginBottom: '8px', paddingLeft: '20px' }}>
                <li>{t('videoCall.feature1')}</li>
                <li>{t('videoCall.feature2')}</li>
                <li>{t('videoCall.feature3')}</li>
              </ul>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                <em>{t('videoCall.note')}</em>
              </p>
            </div>
          }
          type="success"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
        />
        
        
        <Row gutter={24} style={{ flexWrap: 'wrap' }}>
          <Col xs={24} lg={12} xl={13}>
            <Card>
              <div className="video-display">
                <video
                  ref={videoRef}
                  className="video-element"
                  autoPlay
                  muted
                  playsInline
                />
                {!isVideoActive && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white'
                  }}>
                    <VideoCameraOutlined style={{ fontSize: '4rem', marginBottom: '1rem' }} />
                    <div>{t('videoCall.clickToBegin')}</div>
                  </div>
                )}
              </div>

              <div className="video-controls">
                {!isVideoActive ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<VideoCameraOutlined />}
                    onClick={startVideoCall}
                  >
                    {t('videoCall.startVideo')}
                  </Button>
                ) : (
                  <Space size="large">
                    <Button
                      size="large"
                      icon={<CameraOutlined />}
                      onClick={captureImage}
                      disabled={!isVideoActive}
                    >
                      {t('videoCall.captureNow')}
                    </Button>
                  </Space>
                )}
              </div>
            </Card>

            {/* Captured Images */}
            {capturedImages.length > 0 && (
              <Card 
                title={t('videoCall.capturedImagesTitle', { count: capturedImages.length })}
                style={{ marginTop: '20px' }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '12px'
                }}>
                  {capturedImages.map((img, index) => (
                    <div 
                      key={img.id}
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Image
                        src={img.data}
                        alt={`Capture ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        padding: '4px 8px',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{new Date(img.timestamp).toLocaleTimeString()}</span>
                        <DeleteOutlined 
                          style={{ cursor: 'pointer', color: '#ff4d4f' }}
                          onClick={() => {
                            setCapturedImages(prev => prev.filter(i => i.id !== img.id));
                            message.success(t('videoCall.imageDeleted'));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Col>

          <Col xs={24} lg={12} xl={11}>
            {/* AI Chat Assistant */}
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <span>{t('videoCall.aiAssistant')}</span>
                  </Space>
                  <Button
                    type="text"
                    size="small"
                    icon={speechEnabled ? <SoundOutlined /> : <StopOutlined />}
                    onClick={toggleSpeech}
                    style={{ 
                      color: speechEnabled ? '#52c41a' : '#999',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSpeaking && <span style={{ fontSize: '10px' }}>🔊</span>}
                  </Button>
                </div>
              }
              style={{ height: '600px', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
            >
              {/* Chat Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: '#f5f5f5'
              }}>
                {/* Speech hint */}
                {(!speechEnabled && messages.length > 0) ? (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0050b3',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <span>💡 {t('videoCall.enableVoiceHintPrefix')}</span>
                    <StopOutlined style={{ fontSize: '12px' }} />
                    <span>{t('videoCall.enableVoiceHintSuffix')}</span>
                  </div>) : (<div style={{
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0050b3',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <span>💡 {t('videoCall.disableVoiceHintPrefix')}</span>
                    <SoundOutlined style={{ fontSize: '12px' }} />
                    <span>{t('videoCall.disableVoiceHintSuffix')}</span>
                  </div>
                )}
                
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: msg.sender === 'user' ? '#1890ff' : '#fff',
                        color: msg.sender === 'user' ? '#fff' : '#000',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        wordBreak: 'break-word'
                      }}
                    >
                      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {msg.content}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        marginTop: '4px',
                        opacity: 0.7
                      }}>
                        {msg.timestamp?.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isAILoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      <div className="typing-dots">
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#1890ff',
                          margin: '0 2px',
                          animation: 'typing 1.4s infinite'
                        }}></span>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#1890ff',
                          margin: '0 2px',
                          animation: 'typing 1.4s infinite 0.2s'
                        }}></span>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#1890ff',
                          margin: '0 2px',
                          animation: 'typing 1.4s infinite 0.4s'
                        }}></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Control Buttons */}
              <div style={{
                padding: '12px',
                borderTop: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                {/* Speech Recognition Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: isListeningStable ? '#f6ffed' : '#f5f5f5',
                  borderRadius: '8px',
                  border: `1px solid ${isListeningStable ? '#b7eb8f' : '#d9d9d9'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {isListeningStable ? <AudioOutlined style={{ color: '#52c41a', fontSize: '14px' }} /> : <AudioMutedOutlined style={{ color: '#999', fontSize: '14px' }} />}
                  <span style={{ fontWeight: 500, color: isListeningStable ? '#52c41a' : '#666', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {isListeningStable ? t('videoCall.voice') : t('videoCall.text')}
                  </span>
                  <Tooltip title={t('videoCall.toggleSpeechRecognition')}>
                    <Switch
                      checked={speechRecognitionEnabled}
                      onChange={(checked) => {
                        setSpeechRecognitionEnabled(checked);
                        speechRecognitionEnabledRef.current = checked; // Update ref for closure access
                        
                        if (checked) {
                          // Starting - set stable state immediately to prevent flickering
                          setIsListeningStable(true);
                          
                          // Start speech recognition
                          if (recognitionRef.current) {
                            try {
                              recognitionRef.current.start();
                              message.success(t('videoCall.voiceInputEnabled'));
                            } catch (error) {
                              console.error('Error starting speech recognition:', error);
                              message.error(t('videoCall.speechRecognitionFailed'));
                              setSpeechRecognitionEnabled(false);
                              speechRecognitionEnabledRef.current = false;
                              setIsListeningStable(false);
                            }
                          } else {
                            message.error(t('videoCall.speechRecognitionNotAvailable'));
                            setSpeechRecognitionEnabled(false);
                            speechRecognitionEnabledRef.current = false;
                            setIsListeningStable(false);
                          }
                        } else {
                          // Stopping - update state immediately to prevent flickering
                          setIsListeningStable(false);
                          
                          // Stop speech recognition
                          if (recognitionRef.current) {
                            try {
                              recognitionRef.current.stop();
                              message.info(t('videoCall.voiceInputDisabled'));
                            } catch (error) {
                              // Silently handle stop errors
                            }
                          }
                        }
                      }}
                    />
                  </Tooltip>
                </div>

                {/* End Consultation Button */}
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={endConsultation}
                  type="primary"
                  size="large"
                  style={{ backgroundColor: '#52c41a' }}
                >
                  {t('videoCall.endConsultation')}
                </Button>
              </div>

              {/* Chat Input */}
              <div style={{
                padding: '12px',
                borderTop: '1px solid #f0f0f0',
                background: '#fff'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() && !isAILoading) {
                        e.preventDefault();
                        handleSendAIMessage();
                      }
                    }}
                    placeholder={t('videoCall.chatPlaceholder')}
                    disabled={isAILoading}
                    rows={1}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      // minHeight: '40px',
                      // maxHeight: '150px',
                      overflowY: 'auto'
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendAIMessage}
                    disabled={!chatInput.trim() || isAILoading}
                    size="large"
                    style={{ 
                      borderRadius: '6px',
                      height: '40px',
                      minWidth: '80px'
                    }}
                  >
                    {t('videoCall.send')}
                  </Button>
                </div>
              </div>

              {/* Session Info */}
              <div style={{
                padding: '8px 12px',
                background: isListeningStable ? '#f6ffed' : '#f5f5f5',
                borderTop: '1px solid #f0f0f0',
                fontSize: '12px',
                color: '#666',
                transition: 'background 0.3s ease'
              }}>
                <Space split={<Divider type="vertical" />}>
                  <span>🌐 {i18n.language === 'zh' ? '中文' : i18n.language === 'sv' ? 'Svenska' : 'English'}</span>
                  <span>📸 {t('videoCall.images')}: {capturedImages.length}</span>
                  <span style={{
                    color: isListeningStable ? '#52c41a' : '#666',
                    fontWeight: isListeningStable ? 'bold' : 'normal'
                  }}>
                    {isListeningStable ? t('videoCall.listening') : t('videoCall.manualInput')}
                  </span>
                  {isVideoActive && <span style={{ color: '#52c41a' }}>{t('videoCall.videoActive')}</span>}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default VideoCall;