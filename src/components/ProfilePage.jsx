import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  message,
  Modal,
  List,
  Select,
  Row,
  Col,
  Popconfirm,
  Tag
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [profileForm] = Form.useForm();
  const [petForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [petModalVisible, setPetModalVisible] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const petTypes = [
    'Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Fish', 'Reptile', 'Other'
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    setUser(currentUser);
    profileForm.setFieldsValue({
      fullName: currentUser.fullName,
      phone: currentUser.phone,
      email: currentUser.email
    });
  }, [navigate, profileForm]);

  const handleProfileUpdate = async (values) => {
    setLoading(true);
    try {
      const updatedUser = authService.updateProfile(values);
      setUser(updatedUser);
      message.success(t('profile.profileUpdated'));
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPet = () => {
    setEditingPet(null);
    petForm.resetFields();
    setPetModalVisible(true);
  };

  const handleEditPet = (pet) => {
    setEditingPet(pet);
    petForm.setFieldsValue(pet);
    setPetModalVisible(true);
  };

  const handlePetSubmit = async (values) => {
    setLoading(true);
    try {
      if (editingPet) {
        const updatedUser = authService.updatePet(editingPet.id, values);
        setUser(updatedUser);
        message.success(t('profile.petUpdated'));
      } else {
        const updatedUser = authService.addPet(values);
        setUser(updatedUser);
        message.success(t('profile.petAdded'));
      }
      setPetModalVisible(false);
      petForm.resetFields();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePet = async (petId) => {
    try {
      const updatedUser = authService.deletePet(petId);
      setUser(updatedUser);
      message.success(t('profile.petDeleted'));
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    message.success(t('profile.loggedOut'));
    navigate('/auth');
  };

  const handleStartConsultation = (pet) => {
    // Pre-fill booking data with user and pet info
    const bookingData = {
      ownerName: user.fullName,
      phone: user.phone,
      email: user.email,
      petName: pet.name,
      petType: pet.type,
      petAge: pet.age,
      petBreed: pet.breed || '',
      petWeight: pet.weight || '',
      bookingId: `PET-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem('currentBooking', JSON.stringify(bookingData));
    message.success(t('profile.startingConsultation', { petName: pet.name }));
    navigate('/video-call');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div>
          <Title level={1} style={{ color: 'white', margin: 0 }}>
            {t('profile.title')}
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem' }}>
            {t('profile.subtitle')}
          </Text>
        </div>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            size="large"
          >
            {t('profile.backToHome')}
          </Button>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size="large"
          >
            {t('nav.logout')}
          </Button>
        </Space>
      </div>

      <div className="profile-content">
        <Row gutter={24}>
          <Col xs={24} lg={10}>
            <Card title={t('profile.accountInfo')} style={{ marginBottom: 24 }}>
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleProfileUpdate}
                size="large"
              >
                <Form.Item
                  name="fullName"
                  label={t('booking.fullName')}
                  rules={[{ required: true, message: t('booking.pleaseEnterName') }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={t('booking.phoneNumber')}
                  rules={[
                    { required: true, message: t('booking.pleaseEnterPhone') },
                    { pattern: /^\+?[\d\s\-\(\)]+$/, message: t('booking.validPhone') }
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={t('booking.email')}
                >
                  <Input prefix={<MailOutlined />} disabled />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                  >
                    {t('profile.updateProfile')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card
              title={t('profile.myPets')}
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddPet}
                >
                  {t('profile.addPet')}
                </Button>
              }
            >
              {user.pets && user.pets.length > 0 ? (
                <List
                  dataSource={user.pets}
                  renderItem={(pet) => (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          icon={<VideoCameraOutlined />}
                          onClick={() => handleStartConsultation(pet)}
                        >
                          {t('profile.startConsultation')}
                        </Button>,
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => handleEditPet(pet)}
                        >
                          {t('profile.edit')}
                        </Button>,
                        <Popconfirm
                          title={t('profile.deleteConfirm')}
                          description={t('profile.deleteDescription')}
                          onConfirm={() => handleDeletePet(pet.id)}
                          okText={t('profile.yes')}
                          cancelText={t('profile.no')}
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            {t('profile.delete')}
                          </Button>
                        </Popconfirm>
                      ]}
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
                            {pet.breed && <Text>{t('results.breed')}: {pet.breed}</Text>}
                            <Text>{t('results.age')}: {pet.age}</Text>
                            {pet.weight && <Text>{t('results.weight')}: {pet.weight}</Text>}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <HeartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <div>
                    <Text type="secondary">{t('profile.noPetsYet')}</Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddPet}
                    style={{ marginTop: '16px' }}
                  >
                    {t('profile.addFirstPet')}
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={editingPet ? t('profile.editPet') : t('profile.addNewPet')}
        open={petModalVisible}
        onCancel={() => {
          setPetModalVisible(false);
          petForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={petForm}
          layout="vertical"
          onFinish={handlePetSubmit}
        >
          <Form.Item
            name="name"
            label={t('booking.petName')}
            rules={[{ required: true, message: t('profile.pleaseEnterPetName') }]}
          >
            <Input prefix={<HeartOutlined />} placeholder={t('booking.enterPetName')} />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('booking.petType')}
            rules={[{ required: true, message: t('profile.pleaseSelectPetType') }]}
          >
            <Select placeholder={t('booking.selectPetType')}>
              {petTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="age"
                label={t('profile.age')}
                rules={[{ required: true, message: t('profile.pleaseEnterAge') }]}
              >
                <Input placeholder={t('profile.ageExample')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label={t('booking.weight')}>
                <Input placeholder={t('profile.weightExample')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="breed" label={t('booking.breed')}>
            <Input placeholder={t('profile.enterBreed')} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPetModalVisible(false)}>
                {t('profile.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingPet ? t('profile.update') : t('profile.add')} {t('booking.petName')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
