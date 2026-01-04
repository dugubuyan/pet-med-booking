import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { formatDateWithLocale, formatTimeWithLocale, formatDateTimeWithLocale } from '../utils/dateUtils';

const { Title, Text, Paragraph } = Typography;

const AppointmentResults = () => {
  const { t } = useTranslation();
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

    // Get bookingId from URL parameter ONLY
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    console.log('🔗 BookingId from URL:', bookingId);
    
    if (!bookingId) {
      console.error('❌ No bookingId in URL');
      message.error(t('results.noAppointmentId'));
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
        message.error(t('results.appointmentNotFound'));
      }
    } catch (error) {
      console.error('❌ Failed to fetch appointment:', error);
      message.error(t('results.failedToLoad'));
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
    
    message.success(t('results.reportDownloaded'));
    setLoading(false);
  };

  const downloadImages = () => {
    if (!sessionData?.capturedImages?.length) {
      message.warning(t('results.noImages'));
      return;
    }

    sessionData.capturedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.data;
      link.download = image.filename || `pet-image-${index + 1}.jpg`;
      link.click();
    });

    message.success(t('results.imagesDownloaded', { count: sessionData.capturedImages.length }));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return t('results.dateToBeConfirmed');
    // If it's already in YYYY-MM-DD format, convert to readable format
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
    
    return formatDateWithLocale(date, { 
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
            {t('results.noDataFound')}
          </Title>
        </div>
        <div className="results-content">
          <Alert
            message={t('results.noBookingInfo')}
            description={t('results.startNewBooking')}
            type="info"
            action={
              <Button type="primary" onClick={startNewBooking}>
                {t('results.startNewBooking')}
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
          {t('results.title')}
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {t('results.subtitle')}
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
                {t('results.appointmentScheduled')}
              </Title>
              <Text style={{ fontSize: '14px', color: '#666' }}>
                {t('results.consultationRecorded')}
              </Text>
            </div>

            {(() => {
              const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
              const isLoggedIn = currentUser !== null && !bookingData?.isGuest;
              return (
                <>
                  {isLoggedIn ? (
                    <Alert
                      message={t('results.confirmationEmailSent')}
                      description={
                        <div>
                          <p style={{ marginBottom: '4px' }}>
                            {t('results.emailSentTo')} <strong>{bookingData.email || currentUser?.email}</strong>
                          </p>
                          <p style={{ marginBottom: '0', fontSize: '13px' }}>
                            {t('results.checkInbox')}
                          </p>
                        </div>
                      }
                      type="success"
                      showIcon
                      style={{ marginBottom: '20px' }}
                    />
                  ) : (
                    <Alert
                      message={t('results.contactYouSoon')}
                      description={t('results.appointmentRequestSubmitted')}
                      type="info"
                      showIcon
                      style={{ marginBottom: '20px' }}
                    />
                  )}
                </>
              );
            })()}

            <Divider style={{ margin: '20px 0' }}>
              <Text strong style={{ color: '#52c41a' }}>{t('results.appointmentDetails')}</Text>
            </Divider>

            {/* Date and Time Section */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9f7be', marginBottom: '16px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      📅 {t('results.date')}
                    </Text>
                    <Text strong style={{ fontSize: '16px', display: 'block', color: '#52c41a' }}>
                      {formatAppointmentDate(bookingData.appointmentDate)}
                    </Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      🕐 {t('results.time')}
                    </Text>
                    <Text strong style={{ fontSize: '18px', display: 'block', color: '#52c41a' }}>
                      {bookingData.appointmentTime || t('results.timeToBeConfirmed')}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {t('results.durationApprox')}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Location Section */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9f7be', marginBottom: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                📍 {t('results.location')}
              </Text>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                {bookingData.location || t('results.locationToBeConfirmed')}
              </Text>
              {bookingData.location && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        📞 {t('results.phone')}
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        (555) 123-4567
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        🅿️ {t('results.parking')}
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        {t('results.freeParkingAvailable')}
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
                    🏥 {t('results.consultationType')}
                  </Text>
                  <Text strong style={{ fontSize: '16px' }}>
                    {bookingData.appointmentType}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #d9f7be' }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    📋 {t('results.bookingReference')}
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
                <strong>{t('results.whatHappensNext')}</strong>
                <br />
                {t('results.whatHappensNextDesc')}
              </Text>
            </div>

            <Alert
              message={t('results.emergencyNotice')}
              description={t('results.emergencyNoticeDesc')}
              type="warning"
              showIcon
            />
          </div>
        </Card>

        {/* Consultation Details Header */}
        <Divider orientation="left" style={{ marginTop: '32px', marginBottom: '24px' }}>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            📋 {t('results.consultationDetails')}
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
                    {t('results.sessionSummary')}
                  </Space>
                }
                style={{ marginBottom: '24px' }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('results.duration')}>
                    {formatDuration(sessionData.sessionDuration || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('results.imagesCaptured')}>
                    {sessionData.capturedImages?.length || 0} {t('results.images')}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('results.voiceRecording')}>
                    {sessionData.transcription ? t('results.available') : t('results.notAvailable')}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('results.completedAt')}>
                    {formatDateTimeWithLocale(sessionData.endTime)}
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
                    {t('results.petInfo')}
                  </Space>
                }
                style={{ marginBottom: '24px' }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('booking.petName')}>
                    {bookingData.petName}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('results.type')}>
                    {bookingData.petType}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('results.age')}>
                    {bookingData.petAge}
                  </Descriptions.Item>
                  {bookingData.petBreed && (
                    <Descriptions.Item label={t('results.breed')}>{bookingData.petBreed}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </Col>

          <Col xs={24} lg={12}>
            {/* Timeline */}
            <Card
              title={t('results.timeline')}
              style={{ marginBottom: '24px' }}
            >
              <Timeline
                items={[
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>{t('results.sessionStarted')}</Text>
                        <br />
                        <Text type="secondary">{t('results.cameraActivated')}</Text>
                      </div>
                    ),
                  },
                  ...(sessionData?.capturedImages?.length > 0 ? [{
                    color: 'orange',
                    children: (
                      <div>
                        <Text strong>{t('results.imagesCapturedTimeline')}</Text>
                        <br />
                        <Text type="secondary">
                          {t('results.imagesRecorded', { count: sessionData.capturedImages.length })}
                        </Text>
                      </div>
                    ),
                  }] : []),
                  ...(sessionData?.transcription ? [{
                    color: 'purple',
                    children: (
                      <div>
                        <Text strong>{t('results.voiceRecorded')}</Text>
                        <br />
                        <Text type="secondary">{t('results.symptomsTranscribed')}</Text>
                      </div>
                    ),
                  }] : []),
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>{t('results.sessionCompleted')}</Text>
                        <br />
                        <Text type="secondary">
                          {sessionData?.endTime ? formatDateTimeWithLocale(sessionData.endTime) : t('results.justNow')}
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
                {t('results.recordedSymptoms')}
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
                  {t('results.capturedImagesTitle', { count: sessionData.capturedImages.length })}
                </Space>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={downloadImages}
                >
                  {t('results.downloadAll')}
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
                      {formatTimeWithLocale(image.timestamp)}
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
              {t('results.downloadReport')}
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={startNewBooking}
            >
              {t('results.newConsultation')}
            </Button>
          </Space>
        </div>
      </div>


    </div>
  );
};

export default AppointmentResults;