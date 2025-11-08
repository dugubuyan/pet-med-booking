import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import BookingForm from './components/BookingForm';
import VideoCall from './components/VideoCall';
import AppointmentResults from './components/AppointmentResults';
import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/booking" element={<BookingForm />} />
            <Route path="/video-call" element={<VideoCall />} />
            <Route path="/results" element={<AppointmentResults />} />
          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
