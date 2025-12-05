import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  message,
  Alert,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;

const BookingForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const petTypes = [
    'Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Fish', 'Reptile', 'Other'
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Pre-fill owner information
      form.setFieldsValue({
        ownerName: currentUser.fullName,
        phone: currentUser.phone,
        email: currentUser.email,
      });
    }
  }, [form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Store booking data in localStorage for demo purposes
      const bookingData = {
        ...values,
        createdAt: new Date().toISOString(),
      };
      
      localStorage.setItem('currentBooking', JSON.stringify(bookingData));
      
      message.success('Pet information saved! Proceeding to video consultation...');
      
      setTimeout(() => {
        navigate('/video-call');
      }, 1500);
    } catch (error) {
      message.error('Failed to save pet information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-container">
      <div className="booking-header">
        <div>
          <Title level={1} style={{ color: 'white', margin: 0 }}>
            {t('booking.title')}
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem' }}>
            {t('booking.subtitle')}
          </Text>
        </div>
        {!user && (
          <Button
            icon={<LoginOutlined />}
            onClick={() => navigate('/auth')}
            size="large"
            style={{ marginTop: '16px' }}
          >
            {t('booking.loginRegister')}
          </Button>
        )}
      </div>

      <div className="booking-content">
        {user && (
          <Alert
            message={t('booking.welcomeBack', { name: user.fullName })}
            description={
              <Space>
                <span>{t('booking.infoPreFilled')}</span>
                <Button type="link" onClick={() => navigate('/profile')} style={{ padding: 0 }}>
                  {t('booking.manageProfile')}
                </Button>
              </Space>
            }
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          requiredMark={false}
        >
          <Card title={t('booking.ownerInfo')} style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="ownerName"
                  label={t('booking.fullName')}
                  rules={[{ required: true, message: t('booking.pleaseEnterName') }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder={t('booking.enterFullName')}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label={t('booking.phoneNumber')}
                  rules={[
                    { required: true, message: t('booking.pleaseEnterPhone') },
                    { pattern: /^\+?[\d\s\-\(\)]+$/, message: t('booking.validPhone') }
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder={t('booking.enterPhone')}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="email"
              label={t('booking.email')}
              rules={[
                { required: true, message: t('booking.pleaseEnterEmail') },
                { type: 'email', message: t('booking.validEmail') }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t('booking.enterEmail')}
              />
            </Form.Item>
          </Card>

          <Card title={t('booking.petInfo')} style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="petName"
                  label={t('booking.petName')}
                  rules={[{ required: true, message: t('booking.pleaseEnterPetName') }]}
                >
                  <Input
                    prefix={<HeartOutlined />}
                    placeholder={t('booking.enterPetName')}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="petType"
                  label={t('booking.petType')}
                  rules={[{ required: true, message: t('booking.pleaseSelectPetType') }]}
                >
                  <Select placeholder={t('booking.selectPetType')}>
                    {petTypes.map(type => (
                      <Option key={type} value={type}>{type}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="petAge"
                  label={t('booking.petAge')}
                  rules={[{ required: true, message: t('booking.pleaseEnterPetAge') }]}
                >
                  <Input placeholder={t('booking.petAgeExample')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="petBreed"
                  label={t('booking.breed')}
                >
                  <Input placeholder={t('booking.enterBreed')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="petWeight"
                  label={t('booking.weight')}
                >
                  <Input placeholder={t('booking.weightExample')} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Space size="large" style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {t('booking.startVideoConsultation')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default BookingForm;