import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  StopOutlined,
  CameraOutlined,
  SoundOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const VideoCall = () => {
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [transcription, setTranscription] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize speech recognition
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
        
        if (finalTranscript) {
          setTranscription(prev => prev + finalTranscript);
          console.log('Final transcript:', finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        message.error(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      stopVideoCall();
    };
  }, []);

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
      message.success('Video call started successfully!');
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

  const startRecording = () => {
    if (!isVideoActive) {
      message.warning('Please start the video call first.');
      return;
    }

    setIsRecording(true);
    setSessionDuration(0);
    
    // Start session timer
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    // Start automatic image capture every 20 seconds
    captureIntervalRef.current = setInterval(() => {
      captureImage();
    }, 20000);

    // Start speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Starting speech recognition...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        message.error('Failed to start speech recognition');
      }
    }

    message.success('Recording started! Images will be captured every 20 seconds.');
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
    
    // Save session data
    const sessionData = {
      capturedImages,
      transcription,
      sessionDuration,
      endTime: new Date().toISOString(),
    };
    
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
    message.success('Consultation completed! Redirecting to results...');
    
    setTimeout(() => {
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
          Pet Video Consultation
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Get AI-assisted preliminary assessment and book real veterinary hospital appointments
        </Text>
      </div>

      <div className="video-content">
        <Alert
          message="Comprehensive Pet Care Service"
          description={
            <div>
              <p style={{ marginBottom: '8px' }}><strong>What you'll get after this consultation:</strong></p>
              <ul style={{ marginBottom: '8px', paddingLeft: '20px' }}>
                <li>🤖 <strong>AI-Assisted Preliminary Assessment</strong> - Instant analysis of your pet's condition</li>
                <li>🏥 <strong>Real Veterinary Hospital Booking</strong> - Schedule appointments with licensed veterinarians</li>
                <li>📧 <strong>Email Confirmation</strong> - Logged-in users receive appointment details via email</li>
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
        
        <Row gutter={24}>
          <Col xs={24} lg={16}>
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
                    {!isRecording ? (
                      <Button
                        type="primary"
                        size="large"
                        icon={<AudioOutlined />}
                        onClick={startRecording}
                      >
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        danger
                        size="large"
                        icon={<StopOutlined />}
                        onClick={stopRecording}
                      >
                        Stop Recording
                      </Button>
                    )}
                    
                    <Button
                      size="large"
                      icon={<CameraOutlined />}
                      onClick={captureImage}
                      disabled={!isVideoActive}
                    >
                      Capture Now
                    </Button>
                    
                    <Button
                      size="large"
                      icon={<CheckCircleOutlined />}
                      onClick={endConsultation}
                      type="primary"
                      style={{ backgroundColor: '#52c41a' }}
                    >
                      End Consultation
                    </Button>
                  </Space>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Session Status */}
              <Card title="Session Status" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div className={`status-indicator ${isRecording ? 'status-recording' : 'status-active'}`}>
                    <SoundOutlined />
                    {isRecording ? 'Recording Active' : 'Ready to Record'}
                  </div>
                  
                  {isRecording && (
                    <div>
                      <Text strong>Duration: {formatDuration(sessionDuration)}</Text>
                      <Progress
                        percent={Math.min((sessionDuration / 300) * 100, 100)}
                        size="small"
                        status="active"
                      />
                    </div>
                  )}
                  
                  <Text type="secondary">
                    Images captured: {capturedImages.length}
                  </Text>
                </Space>
              </Card>

              {/* Captured Images */}
              {capturedImages.length > 0 && (
                <Card title="Recent Captures" size="small">
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {capturedImages.slice(-3).map((image) => (
                      <div key={image.id} style={{ marginBottom: '8px' }}>
                        <img
                          src={image.data}
                          alt="Captured"
                          style={{
                            width: '100%',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(image.timestamp).toLocaleTimeString()}
                        </Text>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Instructions */}
              <Card title="Instructions" size="small">
                <Space direction="vertical" size="small">
                  <Text>• Position your pet clearly in front of the camera</Text>
                  <Text>• <strong>Describe symptoms and concerns clearly</strong></Text>
                  <Text>• Images are automatically captured every 20 seconds</Text>
                  <Text>• <strong>Speech is transcribed for symptoms recording</strong></Text>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong style={{ color: '#52c41a', fontSize: '13px' }}>
                    ✓ AI Assessment + Hospital Booking Available
                  </Text>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>

        {/* Transcription Panel - Always visible when recording or has content */}
        <div className="transcription-panel" style={{ marginTop: '20px' }}>
          <Title level={4}>
            <SoundOutlined /> Symptoms & Concerns Recording
            {isListening && <span style={{ color: '#52c41a', marginLeft: '8px' }}>● Recording</span>}
            {!isListening && isRecording && <span style={{ color: '#faad14', marginLeft: '8px' }}>● Paused</span>}
          </Title>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{
            minHeight: '120px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '12px',
            background: transcription ? 'white' : '#fafafa',
            borderRadius: '8px',
            border: '1px solid #d9d9d9',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {transcription ? (
              <div>
                <Text strong style={{ color: '#1890ff', fontSize: '12px' }}>TRANSCRIBED SYMPTOMS:</Text>
                <br />
                <Text>{transcription}</Text>
              </div>
            ) : (
              <Text type="secondary" italic>
                {!isRecording 
                  ? 'Start recording to begin transcribing symptoms and concerns.'
                  : isListening 
                    ? 'Listening... Please describe your pet\'s symptoms and concerns clearly.' 
                    : 'Speech recognition is initializing...'}
              </Text>
            )}
          </div>
          
          {/* Debug info for troubleshooting */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              <Text type="secondary">
                Debug: Recording={isRecording.toString()}, Listening={isListening.toString()}, 
                SpeechAPI={('webkitSpeechRecognition' in window || 'SpeechRecognition' in window).toString()}
              </Text>
            </div>
          )}
        </div>

        {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <Alert
            message="Speech Recognition Not Available"
            description="Your browser doesn't support speech recognition. Transcription features will not work."
            type="warning"
            style={{ marginTop: '20px' }}
          />
        )}
      </div>
    </div>
  );
};

export default VideoCall;