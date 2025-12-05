import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Tag,
  Divider,
  Modal,
  List,
  Dropdown
} from 'antd';
import {
  UserOutlined,
  LoginOutlined,
  VideoCameraOutlined,
  HeartOutlined,
  LogoutOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  StarOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text, Paragraph } = Typography;

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [petSelectionVisible, setPetSelectionVisible] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const languageItems = [
    {
      key: 'en',
      label: 'English',
      onClick: () => changeLanguage('en')
    },
    {
      key: 'zh',
      label: '中文',
      onClick: () => changeLanguage('zh')
    },
    {
      key: 'sv',
      label: 'Svenska',
      onClick: () => changeLanguage('sv')
    }
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const handleStartConsultation = () => {
    // Check if user is logged in
    if (user && user.pets && user.pets.length > 0) {
      // If user has multiple pets, show selection modal
      if (user.pets.length > 1) {
        setPetSelectionVisible(true);
      } else {
        // If only one pet, start consultation directly
        startConsultationWithPet(user.pets[0]);
      }
    } else {
      // Guest user - go directly to video call
      handleGuestConsultation();
    }
  };

  const handleGuestConsultation = () => {
    // For guests, go directly to video call without form
    const guestBooking = {
      ownerName: 'Guest User',
      phone: 'N/A',
      email: 'guest@consultation.com',
      petName: 'Pet',
      petType: 'Unknown',
      petAge: 'N/A',
      bookingId: `GUEST-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isGuest: true
    };
    localStorage.setItem('currentBooking', JSON.stringify(guestBooking));
    navigate('/video-call');
  };

  const startConsultationWithPet = (pet) => {
    const bookingData = {
      ownerName: user.fullName,
      phone: user.phone,
      email: user.email,
      petName: pet.name,
      petType: pet.type,
      petAge: pet.age,
      petBreed: pet.breed || '',
      petWeight: pet.weight || '',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('currentBooking', JSON.stringify(bookingData));
    setPetSelectionVisible(false);
    navigate('/video-call');
  };

  return (
    <div className="official-site">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-logo">
            <HeartOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
            <span className="logo-text">{t('nav.logo')}</span>
          </div>
          <div className="nav-links">
            <Space size="large">
              <Dropdown menu={{ items: languageItems }} placement="bottomRight">
                <Button type="link" icon={<GlobalOutlined />} style={{ color: '#fff' }}>
                  {i18n.language === 'zh' ? '中文' : i18n.language === 'sv' ? 'Svenska' : 'English'}
                </Button>
              </Dropdown>
              {user ? (
                <>
                  <Text strong style={{ color: '#fff' }}>{t('nav.welcome', { name: user.fullName })}</Text>
                  <Button type="link" onClick={() => navigate('/profile')} style={{ color: '#fff' }}>
                    {t('nav.myProfile')}
                  </Button>
                  <Button 
                    onClick={handleLogout} 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderColor: '#fff',
                      color: '#fff'
                    }}
                  >
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="link" 
                    onClick={() => {
                      console.log('Login button clicked');
                      navigate('/auth');
                    }} 
                    style={{ color: '#fff' }}
                  >
                    {t('nav.login')}
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={() => {
                      console.log('Sign up button clicked');
                      navigate('/auth');
                    }}
                  >
                    {t('nav.signUp')}
                  </Button>
                </>
              )}
            </Space>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <Tag color="blue" style={{ marginBottom: '16px', fontSize: '14px' }}>
              <StarOutlined /> {t('hero.badge')}
            </Tag>
            <Title level={1} style={{ fontSize: '3.5rem', marginBottom: '24px', color: '#fff' }}>
              {t('hero.title')}
              <br />
              <span style={{ color: '#52c41a' }}>{t('hero.titleHighlight')}</span>
            </Title>
            <Paragraph style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.9)', marginBottom: '32px' }}>
              {t('hero.subtitle')}
            </Paragraph>
            <Space size="large" wrap>
              <Button
                type="primary"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={handleStartConsultation}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  padding: '0 48px',
                  background: '#52c41a',
                  borderColor: '#52c41a'
                }}
              >
                {t('hero.startConsultation')}
              </Button>
              {!user && (
                <Button
                  size="large"
                  onClick={() => navigate('/auth')}
                  style={{
                    height: '56px',
                    fontSize: '18px',
                    padding: '0 48px',
                    background: 'rgba(255,255,255,0.2)',
                    borderColor: '#fff',
                    color: '#fff'
                  }}
                >
                  {t('hero.createAccount')}
                </Button>
              )}
            </Space>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-content">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '16px' }}>
            {t('features.title')}
          </Title>
          <Paragraph style={{ textAlign: 'center', fontSize: '1.1rem', color: '#666', marginBottom: '48px' }}>
            {t('features.subtitle')}
          </Paragraph>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <Card className="feature-card" bordered={false}>
                <RocketOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <Title level={3}>{t('features.instantAccess.title')}</Title>
                <Paragraph style={{ fontSize: '16px', color: '#666' }}>
                  {t('features.instantAccess.description')}
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card" bordered={false}>
                <SafetyOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                <Title level={3}>{t('features.aiCare.title')}</Title>
                <Paragraph style={{ fontSize: '16px', color: '#666' }}>
                  {t('features.aiCare.description')}
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card" bordered={false}>
                <TeamOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: '16px' }} />
                <Title level={3}>{t('features.expertSupport.title')}</Title>
                <Paragraph style={{ fontSize: '16px', color: '#666' }}>
                  {t('features.expertSupport.description')}
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-content">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
            {t('howItWorks.title')}
          </Title>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <Title level={4}>{t('howItWorks.step1.title')}</Title>
                    <Text style={{ fontSize: '16px', color: '#666' }}>
                      {t('howItWorks.step1.description')}
                    </Text>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <Title level={4}>{t('howItWorks.step2.title')}</Title>
                    <Text style={{ fontSize: '16px', color: '#666' }}>
                      {t('howItWorks.step2.description')}
                    </Text>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <Title level={4}>{t('howItWorks.step3.title')}</Title>
                    <Text style={{ fontSize: '16px', color: '#666' }}>
                      {t('howItWorks.step3.description')}
                    </Text>
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
                <Space direction="vertical" size="large" style={{ width: '100%', padding: '40px' }}>
                  <CheckCircleOutlined style={{ fontSize: '64px', color: '#fff' }} />
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    {t('howItWorks.cardTitle')}
                  </Title>
                  <Paragraph style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    {t('howItWorks.cardDescription')}
                  </Paragraph>
                  <Button
                    size="large"
                    onClick={handleStartConsultation}
                    style={{ width: '85%', height: '48px', fontSize: '16px' }}
                  >
                    {t('howItWorks.tryItNow')}
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-content">
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <Card className="benefit-card">
                <ClockCircleOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
                <Title level={4}>{t('benefits.saveTime.title')}</Title>
                <Text style={{ color: '#666' }}>
                  {t('benefits.saveTime.description')}
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="benefit-card">
                <HeartOutlined style={{ fontSize: '40px', color: '#ff4d4f' }} />
                <Title level={4}>{t('benefits.peaceOfMind.title')}</Title>
                <Text style={{ color: '#666' }}>
                  {t('benefits.peaceOfMind.description')}
                </Text>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-content" style={{ textAlign: 'center' }}>
          <Title level={2} style={{ color: '#fff', marginBottom: '24px' }}>
            {t('cta.title')}
          </Title>
          <Paragraph style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', marginBottom: '32px' }}>
            {t('cta.subtitle')}
          </Paragraph>
          <Space size="large" wrap>
            <Button
              type="primary"
              size="large"
              icon={<VideoCameraOutlined />}
              onClick={handleStartConsultation}
              style={{
                height: '56px',
                fontSize: '18px',
                padding: '0 48px',
                background: '#52c41a',
                borderColor: '#52c41a'
              }}
            >
              {t('cta.startConsultation')}
            </Button>
            {!user && (
              <Button
                size="large"
                onClick={() => navigate('/auth')}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  padding: '0 48px',
                  background: '#fff',
                  color: '#1890ff'
                }}
              >
                {t('cta.createAccount')}
              </Button>
            )}
          </Space>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="section-content">
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <Space direction="vertical">
                <Space>
                  <HeartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '18px' }}>{t('nav.logo')}</Text>
                </Space>
                <Text type="secondary">
                  {t('footer.description')}
                </Text>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5}>{t('footer.quickLinks')}</Title>
              <Space direction="vertical">
                <Button type="link" style={{ padding: 0 }} onClick={handleStartConsultation}>
                  {t('footer.startConsultation')}
                </Button>
                <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/auth')}>
                  {t('footer.loginSignUp')}
                </Button>
                {user && (
                  <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/profile')}>
                    {t('footer.myProfile')}
                  </Button>
                )}
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5}>{t('footer.contact')}</Title>
              <Space direction="vertical">
                <Text type="secondary">{t('footer.email')}</Text>
                <Text type="secondary">{t('footer.available')}</Text>
              </Space>
            </Col>
          </Row>
          <Divider />
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            {t('footer.copyright')}
          </Text>
        </div>
      </footer>

      {/* Pet Selection Modal */}
      <Modal
        title={t('petSelection.title')}
        open={petSelectionVisible}
        onCancel={() => setPetSelectionVisible(false)}
        footer={null}
        width={500}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          {t('petSelection.description')}
        </Text>
        <List
          dataSource={user?.pets || []}
          renderItem={(pet) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '8px' }}
              className="pet-selection-item"
              onClick={() => startConsultationWithPet(pet)}
            >
              <List.Item.Meta
                avatar={<HeartOutlined style={{ fontSize: '32px', color: '#1890ff' }} />}
                title={
                  <Space>
                    <Text strong style={{ fontSize: '16px' }}>{pet.name}</Text>
                    <Tag color="blue">{pet.type}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">{t('petSelection.age', { age: pet.age })}</Text>
                    {pet.breed && <Text type="secondary">{t('petSelection.breed', { breed: pet.breed })}</Text>}
                  </Space>
                }
              />
              <Button type="primary" icon={<VideoCameraOutlined />}>
                {t('petSelection.select')}
              </Button>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default HomePage;
