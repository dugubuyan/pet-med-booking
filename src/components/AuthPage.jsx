import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Tabs,
  Typography,
  message,
  Space,
  Divider
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  LoginOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

const AuthPage = () => {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const user = await authService.login(values.email, values.password);
      message.success(`Welcome back, ${user.fullName}!`);
      navigate('/');
    } catch (error) {
      message.error(error.message || 'Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const user = await authService.register(values);
      message.success(`Account created successfully! Welcome, ${user.fullName}!`);
      navigate('/');
    } catch (error) {
      message.error(error.message || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    navigate('/booking');
  };

  const loginTab = (
    <Form
      form={loginForm}
      layout="vertical"
      onFinish={handleLogin}
      size="large"
    >
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Enter your email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Please enter your password' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Enter your password"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
          icon={<LoginOutlined />}
        >
          Login
        </Button>
      </Form.Item>


    </Form>
  );

  const registerTab = (
    <Form
      form={registerForm}
      layout="vertical"
      onFinish={handleRegister}
      size="large"
    >
      <Form.Item
        name="fullName"
        label="Full Name"
        rules={[{ required: true, message: 'Please enter your full name' }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Enter your full name"
        />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Enter your email"
        />
      </Form.Item>

      <Form.Item
        name="phone"
        label="Phone Number"
        rules={[
          { required: true, message: 'Please enter your phone number' },
          { pattern: /^\+?[\d\s\-\(\)]+$/, message: 'Please enter a valid phone number' }
        ]}
      >
        <Input
          prefix={<PhoneOutlined />}
          placeholder="Enter your phone number"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[
          { required: true, message: 'Please enter a password' },
          { min: 6, message: 'Password must be at least 6 characters' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Create a password"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Confirm Password"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Please confirm your password' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Passwords do not match'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Confirm your password"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
          icon={<UserAddOutlined />}
        >
          Create Account
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div className="auth-container">
      <div className="auth-header">
        <Title level={1} style={{ color: 'white', margin: 0 }}>
          Pet Medical Consultation
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem' }}>
          Login or register to save your pet profiles
        </Text>
      </div>

      <div className="auth-content">
        <Card style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Tabs
            defaultActiveKey="login"
            centered
            items={[
              {
                key: 'login',
                label: 'Login',
                children: loginTab
              },
              {
                key: 'register',
                label: 'Register',
                children: registerTab
              }
            ]}
          />

          <Divider>OR</Divider>

          <Button
            block
            size="large"
            onClick={handleGuestAccess}
            style={{ marginTop: '16px' }}
          >
            Continue as Guest
          </Button>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
            You'll need to fill the form each time
          </Text>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
