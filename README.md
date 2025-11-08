# Pet Medical Consultation App

A React-based web application for pet owners to conduct video consultations with AI-assisted diagnosis.

## Features

### 🌐 Official Website Design
- Professional landing page with hero section
- Feature highlights and benefits
- How it works section
- Responsive navigation bar
- Call-to-action sections

### 🔐 User Authentication (Mock)
- **Login/Register**: Create an account to save pet profiles
- **Guest Access**: Instant consultation without forms or registration
- **Demo Account**: `demo@petcare.com` / `demo123`

### 👤 User Profile Management
- Save owner information (name, phone, email)
- Manage multiple pet profiles
- Quick-start consultations from saved pets
- Edit/delete pet profiles

### 🐾 Pet Profile Storage
Each pet profile includes:
- Pet name
- Type (Dog, Cat, Bird, etc.)
- Age
- Breed (optional)
- Weight (optional)

### 📹 Video Consultation
- Live video feed from camera
- Automatic image capture every 20 seconds
- Manual image capture
- Speech-to-text transcription for symptoms
- Session duration tracking
- **No forms required for guests** - instant access

### 📊 Results & AI Analysis
- View captured images
- Review transcribed symptoms
- AI-powered preliminary assessment
- **Book veterinarian appointments** directly from results
- Schedule in-person or video follow-up consultations
- Session summary and recommendations

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## User Flow

### For Registered Users:
1. Login/Register at `/auth`
2. Add pet profiles at `/profile`
3. Start consultation directly from home or profile page
4. Pet information is auto-filled
5. View results and book veterinarian appointments

### For Guest Users:
1. Click "Start Free Consultation" on home page
2. **No form required** - Go directly to video consultation
3. Complete consultation and view AI analysis
4. Book follow-up appointment with veterinarian if needed

## Routes

- `/` - Home page (login/guest options)
- `/auth` - Login/Register page
- `/profile` - User profile & pet management
- `/booking` - Booking form (auto-filled for logged-in users)
- `/video-call` - Video consultation
- `/results` - Consultation results

## Tech Stack

- React 19
- React Router DOM
- Ant Design (UI Components)
- Vite (Build Tool)
- LocalStorage (Mock Authentication & Data Storage)

## Notes

- Authentication is mocked using localStorage for easy testing
- In production, replace with real backend API
- Camera and microphone permissions required for video consultation
- Speech recognition works best in Chrome/Edge browsers
