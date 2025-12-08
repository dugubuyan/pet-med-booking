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
      console.log('Speech synthesis initialized');
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
    
    // Initialize and start speech recognition immediately
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

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
          console.log('Final transcript:', finalTranscript);
          setTranscription(prev => prev + finalTranscript);
          
          // Auto-submit the message when in voice mode
          sendMessageToAI(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          message.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        // Auto-restart if user has enabled speech recognition
        if (speechRecognitionEnabledRef.current) {
          try {
            console.log('Auto-restarting speech recognition...');
            setTimeout(() => {
              if (recognitionRef.current && speechRecognitionEnabledRef.current) {
                try {
                  recognitionRef.current.start();
                  console.log('Speech recognition restarted successfully');
                } catch (err) {
                  console.error('Error in restart:', err);
                }
              }
            }, 100);
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
          }
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      stopVideoCall();
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
    
    let greeting;
    
    if (user && user.pets && user.pets.length > 0 && currentPetId) {
      const selectedPet = user.pets.find(p => p.id === currentPetId);
      
      if (selectedPet) {
        const petName = selectedPet.name;
        greeting = `Hello ${user.fullName}! I'm here to help with ${petName}'s health. What brings you in today?`;
      } else {
        greeting = `Hello ${user.fullName}! I'm here to help with your pet's health. What brings you in today?`;
      }
    } else if (user) {
      greeting = `Hello ${user.fullName}! I'm here to help with your pet's health. What brings you in today?`;
    } else {
      greeting = "Hello! I'm here to help with your pet's health. What brings you in today?";
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
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties based on language
    utterance.lang = i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
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
    
    message.success(newState ? 'Speech enabled - AI will speak responses' : 'Speech disabled');
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
      
      // If appointment was booked, store the bookingId
      if (response.appointmentBooked && response.bookingId) {
        console.log('✅ Appointment booked in VideoCall! BookingId:', response.bookingId);
        localStorage.setItem('currentBookingId', response.bookingId);
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
      
      message.success('Video started! Auto-capture enabled every 20 seconds.');
    } catch (error) {
      console.error('Error accessing camera:', error);
      message.error('Failed to access camera. Please check permissions.');
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

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    setIsVideoActive(false);
    setIsRecording(false);
    setIsListening(false);
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      message.warning('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping speech recognition...');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    } else {
      try {
        recognitionRef.current.start();
        console.log('Starting speech recognition...');
        message.success('Speech recognition started. Speak to input text.');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        message.error('Failed to start speech recognition');
      }
    }
  };

  const startRecording = () => {
    console.log('startRecording called, isVideoActive:', isVideoActive);
    
    if (!isVideoActive) {
      message.warning('Please start the video call first.');
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

    // Start speech recognition
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started with recording');
        message.success('Recording started! Speech recognition and image capture enabled.');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        message.success('Recording started! Images will be captured every 20 seconds.');
      }
    } else {
      message.success('Recording started! Images will be captured every 20 seconds.');
    }

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

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping speech recognition...');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }

    message.success('Recording stopped.');
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
    message.info(`Image captured at ${new Date(timestamp).toLocaleTimeString()}`);
  };

  const endConsultation = () => {
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
    message.success('Consultation completed! Redirecting to results...');
    
    setTimeout(() => {
      // Get bookingId from localStorage if available
      const bookingId = localStorage.getItem('currentBookingId');
      if (bookingId) {
        navigate(`/results?bookingId=${bookingId}`);
        return;
      }
      
      // Fallback: check old format
      const booking = localStorage.getItem('currentBooking');
      if (booking) {
        const bookingInfo = JSON.parse(booking);
        if (bookingInfo.bookingId) {
          navigate(`/results?bookingId=${bookingInfo.bookingId}`);
          return;
        }
      }
      
      navigate('/results');
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
          Pet Video Consultation with AI Assistant
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Capture images through video while chatting with our AI veterinary assistant
        </Text>
      </div>

      <div className="video-content">
        <Alert
          message="AI-Assisted Video Consultation"
          description={
            <div>
              <p style={{ marginBottom: '8px' }}><strong>How to start:</strong></p>
              <ol style={{ marginBottom: '8px', paddingLeft: '20px' }}>
                <li>Click <strong>"Start Video"</strong> to enable your camera</li>
                <li>Toggle the <strong>Speech Recognition switch</strong> to enable voice input (or use manual text input)</li>
                <li>Chat with the AI assistant and capture images of your pet</li>
                <li>Click <strong>"End Consultation"</strong> when finished</li>
              </ol>
              <p style={{ marginBottom: '8px' }}><strong>Features:</strong></p>
              <ul style={{ marginBottom: '8px', paddingLeft: '20px' }}>
                <li>📹 <strong>Video Capture</strong> - Click "Capture Now" or automatic capture every 20 seconds</li>
                <li>🎤 <strong>Speech Recognition</strong> - Toggle switch to speak or type manually</li>
                <li>🤖 <strong>AI Assistant</strong> - Get real-time guidance on pet health concerns</li>
              </ul>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                <em>Note: AI assessment is preliminary only. Professional veterinary consultation is recommended for accurate diagnosis.</em>
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
                    <div>Click "Start Video" to begin</div>
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
                    Start Video
                  </Button>
                ) : (
                  <Space size="large">
                    <Button
                      size="large"
                      icon={<CameraOutlined />}
                      onClick={captureImage}
                      disabled={!isVideoActive}
                    >
                      Capture Now
                    </Button>
                  </Space>
                )}
              </div>
            </Card>

            {/* Captured Images */}
            {capturedImages.length > 0 && (
              <Card 
                title={`Captured Images (${capturedImages.length})`}
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
                            message.success('Image deleted');
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
                    <span>AI Veterinary Assistant</span>
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
                    textAlign: 'center'
                  }}>
                    💡 Click the <StopOutlined /> button above to enable AI voice responses
                  </div>) : (<div style={{
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0050b3',
                    textAlign: 'center'
                  }}>
                    💡 Click the <SoundOutlined /> button above to disable AI voice responses
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
                  background: isListening ? '#f6ffed' : '#f5f5f5',
                  borderRadius: '8px',
                  border: `1px solid ${isListening ? '#b7eb8f' : '#d9d9d9'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {isListening ? <AudioOutlined style={{ color: '#52c41a', fontSize: '14px' }} /> : <AudioMutedOutlined style={{ color: '#999', fontSize: '14px' }} />}
                  <span style={{ fontWeight: 500, color: isListening ? '#52c41a' : '#666', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {isListening ? 'Voice' : 'Text'}
                  </span>
                  <Tooltip title="Toggle speech recognition">
                    <Switch
                      checked={speechRecognitionEnabled}
                      onChange={(checked) => {
                        setSpeechRecognitionEnabled(checked);
                        speechRecognitionEnabledRef.current = checked; // Update ref for closure access
                        
                        if (checked) {
                          // Start speech recognition
                          if (recognitionRef.current) {
                            try {
                              recognitionRef.current.start();
                              console.log('Speech recognition enabled via switch');
                              message.success('Voice input enabled - will auto-restart on silence');
                            } catch (error) {
                              console.error('Error starting speech recognition:', error);
                              message.error('Failed to start speech recognition: ' + error.message);
                              setSpeechRecognitionEnabled(false);
                              speechRecognitionEnabledRef.current = false;
                            }
                          } else {
                            message.error('Speech recognition not available');
                            setSpeechRecognitionEnabled(false);
                            speechRecognitionEnabledRef.current = false;
                          }
                        } else {
                          // Stop speech recognition
                          if (recognitionRef.current) {
                            try {
                              recognitionRef.current.stop();
                              console.log('Speech recognition disabled via switch');
                              message.info('Voice input disabled');
                            } catch (error) {
                              console.error('Error stopping speech recognition:', error);
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
                  End Consultation
                </Button>
              </div>

              {/* Chat Input */}
              <div style={{
                padding: '12px',
                borderTop: '1px solid #f0f0f0',
                background: '#fff'
              }}>
                <Space.Compact style={{ width: '100%' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() && !isAILoading) {
                        e.preventDefault();
                        handleSendAIMessage();
                      }
                    }}
                    placeholder="Ask the AI assistant about your pet..."
                    disabled={isAILoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendAIMessage}
                    disabled={!chatInput.trim() || isAILoading}
                    style={{ borderRadius: '0 6px 6px 0' }}
                  >
                    Send
                  </Button>
                </Space.Compact>
              </div>

              {/* Session Info */}
              <div style={{
                padding: '8px 12px',
                background: isListening ? '#f6ffed' : '#f5f5f5',
                borderTop: '1px solid #f0f0f0',
                fontSize: '12px',
                color: '#666',
                transition: 'background 0.3s ease'
              }}>
                <Space split={<Divider type="vertical" />}>
                  <span>📸 Images: {capturedImages.length}</span>
                  <span style={{
                    color: isListening ? '#52c41a' : '#666',
                    fontWeight: isListening ? 'bold' : 'normal'
                  }}>
                    {isListening ? '🎤 Listening' : '⌨️ Manual Input'}
                  </span>
                  {isVideoActive && <span style={{ color: '#52c41a' }}>📹 Video Active</span>}
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