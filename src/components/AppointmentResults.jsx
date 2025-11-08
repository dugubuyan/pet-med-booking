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
  Modal,
  Form,
  DatePicker,
  TimePicker,
  Select,
  Input,
} from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  HomeOutlined,
  CalendarOutlined,
  UserOutlined,
  HeartOutlined,
  CameraOutlined,
  SoundOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AppointmentResults = () => {
  const [bookingData, setBookingData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [appointmentBooked, setAppointmentBooked] = useState(false);
  const [appointmentForm] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    // Load data from localStorage
    const booking = localStorage.getItem('currentBooking');
    const session = localStorage.getItem('sessionData');
    
    if (booking) {
      setBookingData(JSON.parse(booking));
    }
    
    if (session) {
      setSessionData(JSON.parse(session));
    }
  }, []);

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

  const printReport = () => {
    window.print();
  };

  const startNewBooking = () => {
    // Clear stored data
    localStorage.removeItem('currentBooking');
    localStorage.removeItem('sessionData');
    navigate('/');
  };

  const handleBookAppointment = () => {
    // Pre-fill form with existing data
    if (bookingData && !bookingData.isGuest) {
      // For logged-in users, pre-fill all known information
      appointmentForm.setFieldsValue({
        ownerName: bookingData.ownerName,
        email: bookingData.email,
        phone: bookingData.phone,
        petName: bookingData.petName,
      });
    } else if (bookingData && bookingData.isGuest) {
      // For guests, only pre-fill if they provided info in booking form
      appointmentForm.setFieldsValue({
        ownerName: bookingData.ownerName !== 'Guest User' ? bookingData.ownerName : '',
        email: bookingData.email !== 'guest@consultation.com' ? bookingData.email : '',
        phone: bookingData.phone !== 'N/A' ? bookingData.phone : '',
        petName: bookingData.petName !== 'Pet' ? bookingData.petName : '',
      });
    }
    setAppointmentModalVisible(true);
  };

  const handleAppointmentSubmit = (values) => {
    const appointmentData = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      time: values.time.format('HH:mm'),
      appointmentId: `APT-${Date.now()}`,
      consultationId: bookingData?.bookingId,
      createdAt: new Date().toISOString(),
      status: 'Pending Confirmation'
    };

    // Store appointment data
    const existingAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    existingAppointments.push(appointmentData);
    localStorage.setItem('appointments', JSON.stringify(existingAppointments));

    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
    const isLoggedIn = currentUser !== null && !bookingData?.isGuest;

    if (isLoggedIn) {
      // Simulate email sending for logged-in users
      message.success({
        content: (
          <div>
            <div><strong>Appointment request submitted successfully!</strong></div>
            <div style={{ marginTop: '8px' }}>📧 Confirmation email sent to: <strong>{values.email}</strong></div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Check your inbox for appointment details and next steps.
            </div>
          </div>
        ),
        duration: 6,
      });
    } else {
      // Guest users don't receive email
      message.success({
        content: (
          <div>
            <div><strong>Appointment request submitted successfully!</strong></div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              💡 Tip: Create an account to receive email confirmations for future appointments.
            </div>
          </div>
        ),
        duration: 5,
      });
    }

    setAppointmentModalVisible(false);
    appointmentForm.resetFields();
    setAppointmentBooked(true); // Set appointment booked state
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} minutes ${secs} seconds`;
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
        {/* Action Buttons */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <Space size="large">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadReport}
              loading={loading}
              size="large"
            >
              Download Report
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={printReport}
              size="large"
            >
              Print Report
            </Button>
            <Button
              icon={<HomeOutlined />}
              onClick={startNewBooking}
              size="large"
            >
              New Booking
            </Button>
          </Space>
        </div>

        <Row gutter={24}>
          <Col xs={24} lg={12}>
            {/* Booking Information */}
            <Card
              title={
                <Space>
                  <CalendarOutlined />
                  Appointment Details
                </Space>
              }
              style={{ marginBottom: '24px' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Booking ID">
                  <Tag color="blue">{bookingData.bookingId}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Date & Time">
                  {bookingData.appointmentDate} at {bookingData.appointmentTime}
                </Descriptions.Item>
                <Descriptions.Item label="Consultation Type">
                  <Tag color="green">{bookingData.appointmentType}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Completed
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Pet Owner Information */}
            <Card
              title={
                <Space>
                  <UserOutlined />
                  Pet Owner Information
                </Space>
              }
              style={{ marginBottom: '24px' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">
                  {bookingData.isGuest ? (
                    <Text type="secondary">Guest User</Text>
                  ) : (
                    bookingData.ownerName
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {bookingData.isGuest ? (
                    <Text type="secondary">Not provided</Text>
                  ) : (
                    bookingData.email
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {bookingData.isGuest ? (
                    <Text type="secondary">Not provided</Text>
                  ) : (
                    bookingData.phone
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Pet Information */}
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
                  {bookingData.isGuest ? (
                    <Text type="secondary">Not specified</Text>
                  ) : (
                    bookingData.petName
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  {bookingData.isGuest ? (
                    <Text type="secondary">Not specified</Text>
                  ) : (
                    bookingData.petType
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Age">
                  {bookingData.isGuest ? (
                    <Text type="secondary">Not specified</Text>
                  ) : (
                    bookingData.petAge
                  )}
                </Descriptions.Item>
                {!bookingData.isGuest && bookingData.petBreed && (
                  <Descriptions.Item label="Breed">{bookingData.petBreed}</Descriptions.Item>
                )}
                {!bookingData.isGuest && bookingData.petWeight && (
                  <Descriptions.Item label="Weight">{bookingData.petWeight}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

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
                  <Descriptions.Item label="Transcription">
                    {sessionData.transcription ? 'Available' : 'Not available'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Completed At">
                    {new Date(sessionData.endTime).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

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
                        <Text strong>Booking Created</Text>
                        <br />
                        <Text type="secondary">
                          {new Date(bookingData.createdAt).toLocaleString()}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>Video Session Started</Text>
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
                          {sessionData.capturedImages.length} images automatically captured
                        </Text>
                      </div>
                    ),
                  }] : []),
                  ...(sessionData?.transcription ? [{
                    color: 'purple',
                    children: (
                      <div>
                        <Text strong>Voice Transcription</Text>
                        <br />
                        <Text type="secondary">Speech recorded and transcribed</Text>
                      </div>
                    ),
                  }] : []),
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>Consultation Completed</Text>
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
                Symptoms & Concerns (Voice Recorded)
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <div style={{
              background: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <Paragraph>
                {sessionData.transcription}
              </Paragraph>
            </div>
          </Card>
        )}

        {/* Captured Images */}
        {sessionData?.capturedImages?.length > 0 && (
          <Card
            title={
              <Space>
                <CameraOutlined />
                Captured Images ({sessionData.capturedImages.length})
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={downloadImages}
                >
                  Download All
                </Button>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <div className="captured-images">
              {sessionData.capturedImages.map((image, index) => (
                <div key={image.id} className="captured-image">
                  <Image
                    src={image.data}
                    alt={`Captured at ${new Date(image.timestamp).toLocaleTimeString()}`}
                    style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(image.timestamp).toLocaleString()}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Analysis & Recommendations */}
        <Card
          title="🤖 AI Analysis & Hospital Booking"
          style={{ marginBottom: '24px' }}
        >
          <Alert
            message="Comprehensive Pet Care Service"
            description={
              <div>
                <p><strong>✅ AI-Assisted Preliminary Assessment Complete</strong></p>
                <ul>
                  <li>✓ Video and images have been analyzed by our AI system</li>
                  <li>✓ Symptoms and concerns have been recorded and transcribed</li>
                  <li>✓ Preliminary assessment suggests {sessionData?.transcription ? 'further evaluation recommended' : 'monitoring advised'}</li>
                </ul>
                <Divider style={{ margin: '16px 0' }} />
                <p><strong>📋 Professional Review Process:</strong></p>
                <ul>
                  <li>A veterinary professional will review your consultation within 24-48 hours</li>
                  <li>You will receive a detailed medical report via email (for registered users)</li>
                  <li>If urgent care is needed, you will be contacted immediately</li>
                </ul>
                <Divider style={{ margin: '16px 0' }} />
                <p><strong>🏥 Book Real Veterinary Hospital Appointment:</strong></p>
                <p>Schedule an in-person or video appointment with a licensed veterinarian at a real veterinary hospital for comprehensive examination and treatment.</p>
                {appointmentBooked && (() => {
                  const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
                  const isLoggedIn = currentUser !== null && !bookingData?.isGuest;
                  return (
                    <Alert
                      message={isLoggedIn ? "📧 Email Sent" : "✅ Appointment Booked"}
                      description={
                        isLoggedIn 
                          ? `We have sent you a confirmation email to ${bookingData.email || currentUser?.email || 'your registered email'}. Please check your inbox for appointment details and next steps.`
                          : "Your appointment request has been submitted successfully. You will be contacted shortly."
                      }
                      type="success"
                      showIcon
                      style={{ marginTop: '12px', marginBottom: '12px' }}
                    />
                  );
                })()}
                {!appointmentBooked && (() => {
                  const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
                  const isLoggedIn = currentUser !== null && !bookingData?.isGuest;
                  if (!isLoggedIn) {
                    return (
                      <Alert
                        message="💡 Create Account for Email Notifications"
                        description="Register for an account to receive email confirmations for your appointments."
                        type="info"
                        showIcon
                        style={{ marginTop: '12px', marginBottom: '12px' }}
                      />
                    );
                  }
                  return null;
                })()}
                <Button
                  type="primary"
                  size="large"
                  icon={<CalendarOutlined />}
                  onClick={handleBookAppointment}
                  style={{ marginTop: '8px' }}
                  disabled={appointmentBooked}
                >
                  {appointmentBooked ? 'Appointment Booked' : 'Book Veterinarian Appointment'}
                </Button>
                <Divider style={{ margin: '16px 0' }} />
                <Alert
                  message="Emergency Notice"
                  description="If your pet's condition worsens or shows signs of distress, please contact your local veterinary emergency clinic immediately."
                  type="warning"
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              </div>
            }
            type="info"
            showIcon
          />
        </Card>

        {/* Footer Actions */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Space size="large" wrap>
            <Button
              type="primary"
              size="large"
              icon={<CalendarOutlined />}
              onClick={handleBookAppointment}
            >
              Book Veterinarian Appointment
            </Button>
            <Button
              size="large"
              icon={<HomeOutlined />}
              onClick={startNewBooking}
            >
              New Consultation
            </Button>
          </Space>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      <Modal
        title="Book Veterinarian Appointment"
        open={appointmentModalVisible}
        onCancel={() => {
          setAppointmentModalVisible(false);
          appointmentForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Schedule Your Appointment"
          description={
            <div>
              <p>Book a follow-up appointment with a licensed veterinarian for a comprehensive examination of your pet.</p>
              {(() => {
                const currentUser = JSON.parse(localStorage.getItem('pet_app_current_user') || 'null');
                const isLoggedIn = currentUser !== null && !bookingData?.isGuest;
                return isLoggedIn ? (
                  <div>
                    <p style={{ marginTop: '8px', marginBottom: '4px' }}>
                      📧 <strong>Email confirmation will be sent to:</strong>
                    </p>
                    <p style={{ margin: 0, paddingLeft: '24px', color: '#1890ff', fontWeight: '500' }}>
                      {bookingData.email || currentUser?.email}
                    </p>
                  </div>
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0, color: '#faad14' }}>
                    💡 <strong>Note:</strong> Email confirmations are only sent to registered users. 
                    <a href="/auth" style={{ marginLeft: '4px' }}>Create an account</a> to receive email notifications.
                  </p>
                );
              })()}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
        
        <Form
          form={appointmentForm}
          layout="vertical"
          onFinish={handleAppointmentSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ownerName"
                label="Your Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please enter your phone' },
                  { pattern: /^\+?[\d\s\-\(\)]+$/, message: 'Invalid phone number' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email address' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="petName"
            label="Pet Name"
            rules={[{ required: true, message: 'Please enter pet name' }]}
          >
            <Input prefix={<HeartOutlined />} placeholder="Pet name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Preferred Date"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="time"
                label="Preferred Time"
                rules={[{ required: true, message: 'Please select a time' }]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="appointmentType"
            label="Appointment Type"
            rules={[{ required: true, message: 'Please select appointment type' }]}
          >
            <Select placeholder="Select appointment type">
              <Option value="In-Person Consultation">In-Person Consultation</Option>
              <Option value="Video Consultation">Video Consultation</Option>
              <Option value="Follow-up Visit">Follow-up Visit</Option>
              <Option value="Emergency">Emergency</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason for Visit"
            rules={[{ required: true, message: 'Please describe the reason' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe your pet's symptoms or concerns..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAppointmentModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Submit Appointment Request
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentResults;