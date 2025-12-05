import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Descriptions,
  Button,
  Space,
  Image,
  Divider,
  Alert,
  Row,
  Col,
  Tag,
  Timeline,
  message,
} from 'antd';
import {
  DownloadOutlined,
  HomeOutlined,
  HeartOutlined,
  CameraOutlined,
  SoundOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title, Text, Paragraph } = Typography;

const AppointmentResults = () => {
  const [bookingData, setBookingData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointmentData();
  }, []);

  const loadAppointmentData = async () => {
    // Load session data from localStorage (for images/transcription)
    const session = localStorage.getItem('sessionData');
    if (session) {
      setSessionData(JSON.parse(session));
    }

    // Get bookingId from URL parameter first, then fallback to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    let bookingId = urlParams.get('bookingId');
    
    if (!bookingId) {
      // Try to get from localStorage as fallback
      bookingId = localStorage.getItem('currentBookingId');
      console.log('🔗 BookingId from localStorage:', bookingId);
    } else {
      console.log('🔗 BookingId from URL:', bookingId);
    }
    
    if (!bookingId) {
      console.error('❌ No bookingId in URL or localStorage');
      message.error('No appointment ID provided');
      return;
    }
    
    // Fetch appointment data from backend
    console.log('🔍 Fetching appointment from backend with ID:', bookingId);
    try {
      setLoading(true);
      const response = await apiService.getAppointment(bookingId);
      console.log('✅ Backend response:', response);
      
      if (response.success && response.appointment) {
        console.log('📅 Appointment data received:', response.appointment);
        setBookingData(response.appointment);
      } else {
        console.error('⚠️ No appointment found');
        message.error('Appointment not found');
      }
    } catch (error) {
      console.error('❌ Failed to fetch appointment:', error);
      message.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    setLoading(true);
    
    // Create a comprehensive report
    const report = {
      bookingDetails: bookingData,
      sessionDetails: sessionData,
      generatedAt: new Date().toISOString(),
      reportId: `RPT-${Date.now()}`,
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `pet-consultation-report-${bookingData?.bookingId || 'unknown'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success('Report downloaded successfully!');
    setLoading(false);
  };

  const downloadImages = () => {
    if (!sessionData?.capturedImages?.length) {
      message.warning('No images to download.');
      return;
    }

    sessionData.capturedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.data;
      link.download = image.filename || `pet-image-${index + 1}.jpg`;
      link.click();
    });

    message.success(`Downloaded ${sessionData.capturedImages.length} images!`);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return 'Date to be confirmed';
    // If it's already in YYYY-MM-DD format, convert to readable format
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const startNewBooking = () => {
    // Clear stored data
    localStorage.removeItem('currentBooking');
    localStorage.removeItem('sessionData');
    navigate('/');
  };

  if (!bookingData) {
    return (
      <div className="results-container">
        <div className="results-header">
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            No Appointment Data Found
          </Title>
        </div>
        <div className="results-content">
          <Alert
            message="No booking information available"
            description="Please start a new booking to see results here."
            type="info"
            action={
              <Button type="primary" onClick={startNewBooking}>
                Start New Booking
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          Consultation Results
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Complete summary of your pet's consultation session
        </Text>
      </div>

      <div className="results-content">
        {/* Appointment Details - TOP PRIORITY */}
        <Card
          style={{ marginBottom: '24px', background: '#f6ffed', borderColor: '#b7eb8f' }}
        >
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '12px' }} />
              <Title level={3} style={{ color: '#52c41a', marginBottom: '8px' }}>
                ✅ Appointment Scheduled
              </Title>
              <Text style={{ fontSize: '14px', color: '#666' }}>
                Your consultation has been recorded and an appointment has been created
              </Text>
            </div>

            {(() => {
              const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
              const isLoggedIn = currentUser !== null && !bookingData?.isGuest;
              return (
                <>
                  {isLoggedIn ? (
                    <Alert
                      message="📧 Confirmation Email Sent"
                      description={
                        <div>
                          <p style={{ marginBottom: '4px' }}>
                            A confirmation email has been sent to: <strong>{bookingData.email || currentUser?.email}</strong>
                          </p>
                          <p style={{ marginBottom: '0', fontSize: '13px' }}>
                            Please check your inbox for complete appointment details.
                          </p>
                        </div>
                      }
                      type="success"
                      showIcon
                      style={{ marginBottom: '20px' }}
                    />
                  ) : (
                    <Alert
                      message="📞 We'll Contact You Soon"
                      description="Your appointment request has been submitted. Our team will contact you via phone to confirm the details."
                      type="info"
                      showIcon
                      style={{ marginBottom: '20px' }}
                    />
                  )}
                </>
              );
            })()}

            <Divider style={{ margin: '20px 0' }}>
              <Text strong style={{ color: '#52c41a' }}>Appointment Details</Text>
            </Divider>

            {/* Date and Time Section */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9f7be', marginBottom: '16px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      📅 Date
                    </Text>
                    <Text strong style={{ fontSize: '16px', display: 'block', color: '#52c41a' }}>
                      {formatAppointmentDate(bookingData.appointmentDate)}
                    </Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      🕐 Time
                    </Text>
                    <Text strong style={{ fontSize: '18px', display: 'block', color: '#52c41a' }}>
                      {bookingData.appointmentTime || 'Time to be confirmed'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Duration: Approximately 30-45 minutes
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Location Section */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9f7be', marginBottom: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                📍 Location
              </Text>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                {bookingData.location || 'Location to be confirmed'}
              </Text>
              {bookingData.location && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        📞 Phone
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        (555) 123-4567
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        🅿️ Parking
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        Free parking available
                      </Text>
                    </Col>
                  </Row>
                </>
              )}
            </div>

            {/* Appointment Type and ID */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col xs={24} md={12}>
                <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #d9f7be' }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    🏥 Consultation Type
                  </Text>
                  <Text strong style={{ fontSize: '16px' }}>
                    {bookingData.appointmentType}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #d9f7be' }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    📋 Booking Reference
                  </Text>
                  <Text strong style={{ fontSize: '16px' }}>
                    {bookingData.bookingId}
                  </Text>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '20px 0' }} />

            <div style={{ background: '#fffbe6', padding: '12px', borderRadius: '8px', border: '1px solid #ffe58f', marginBottom: '16px' }}>
              <Text style={{ fontSize: '14px' }}>
                <strong>⏰ What happens next?</strong>
                <br />
                A veterinary professional will review your consultation data and contact you within 24-48 hours to confirm your appointment and discuss your pet's condition.
              </Text>
            </div>

            <Alert
              message="⚠️ Emergency Notice"
              description="If your pet shows signs of severe distress, difficulty breathing, or severe bleeding, contact your local veterinary emergency clinic immediately."
              type="warning"
              showIcon
            />
          </div>
        </Card>

        {/* Consultation Details Header */}
        <Divider orientation="left" style={{ marginTop: '32px', marginBottom: '24px' }}>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            📋 Consultation Details
          </Text>
        </Divider>

        <Row gutter={24}>
          <Col xs={24} lg={12}>
            {/* Session Summary */}
            {sessionData && (
              <Card
                title={
                  <Space>
                    <ClockCircleOutlined />
                    Session Summary
                  </Space>
                }
                style={{ marginBottom: '24px' }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Duration">
                    {formatDuration(sessionData.sessionDuration || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Images Captured">
                    {sessionData.capturedImages?.length || 0} images
                  </Descriptions.Item>
                  <Descriptions.Item label="Voice Recording">
                    {sessionData.transcription ? 'Available' : 'Not available'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Completed At">
                    {new Date(sessionData.endTime).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* Pet Information */}
            {!bookingData.isGuest && (
              <Card
                title={
                  <Space>
                    <HeartOutlined />
                    Pet Information
                  </Space>
                }
                style={{ marginBottom: '24px' }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Pet Name">
                    {bookingData.petName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Type">
                    {bookingData.petType}
                  </Descriptions.Item>
                  <Descriptions.Item label="Age">
                    {bookingData.petAge}
                  </Descriptions.Item>
                  {bookingData.petBreed && (
                    <Descriptions.Item label="Breed">{bookingData.petBreed}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </Col>

          <Col xs={24} lg={12}>
            {/* Timeline */}
            <Card
              title="Consultation Timeline"
              style={{ marginBottom: '24px' }}
            >
              <Timeline
                items={[
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>Session Started</Text>
                        <br />
                        <Text type="secondary">Camera and audio activated</Text>
                      </div>
                    ),
                  },
                  ...(sessionData?.capturedImages?.length > 0 ? [{
                    color: 'orange',
                    children: (
                      <div>
                        <Text strong>Images Captured</Text>
                        <br />
                        <Text type="secondary">
                          {sessionData.capturedImages.length} images recorded
                        </Text>
                      </div>
                    ),
                  }] : []),
                  ...(sessionData?.transcription ? [{
                    color: 'purple',
                    children: (
                      <div>
                        <Text strong>Voice Recorded</Text>
                        <br />
                        <Text type="secondary">Symptoms transcribed</Text>
                      </div>
                    ),
                  }] : []),
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>Session Completed</Text>
                        <br />
                        <Text type="secondary">
                          {sessionData?.endTime ? new Date(sessionData.endTime).toLocaleString() : 'Just now'}
                        </Text>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        {/* Symptoms and Concerns */}
        {sessionData?.transcription && (
          <Card
            title={
              <Space>
                <SoundOutlined />
                Recorded Symptoms
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <div style={{
              background: '#fafafa',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #f0f0f0'
            }}>
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {sessionData.transcription}
              </Paragraph>
            </div>
          </Card>
        )}

        {/* Captured Images */}
        {sessionData?.capturedImages?.length > 0 && (
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <CameraOutlined />
                  Captured Images ({sessionData.capturedImages.length})
                </Space>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={downloadImages}
                >
                  Download All
                </Button>
              </div>
            }
            style={{ marginBottom: '24px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {sessionData.capturedImages.map((image, index) => (
                <div key={image.id} style={{ border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <Image
                    src={image.data}
                    alt={`Captured ${index + 1}`}
                    style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '8px', textAlign: 'center', background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(image.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
          <Space size="large" wrap>
            <Button
              size="large"
              icon={<DownloadOutlined />}
              onClick={downloadReport}
              loading={loading}
            >
              Download Report
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={startNewBooking}
            >
              New Consultation
            </Button>
          </Space>
        </div>
      </div>


    </div>
  );
};

export default AppointmentResults;