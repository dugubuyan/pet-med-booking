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

### 🤖 AI Consultation Assistant
- **Chat with AI**: Natural conversation interface for pet health concerns
- **Smart Information Collection**: AI gathers owner and pet details conversationally
- **Context-Aware**: Recognizes registered users and pre-fills information
- **Multi-Language Support**: English, Chinese, and Swedish
- **Appointment Creation**: Book appointments directly from chat
- **Guest & Registered Access**: Available for all users

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

### Quick Start (Development)

**1. Backend Setup:**
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_api_key_here

# Start the backend server
npm start
```

**2. Frontend Setup:**
```bash
# In the root directory
npm install

# Run development server
npm run dev
```

**3. Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

```bash
# Build for production
npm run build

# The dist/ folder contains the production build
```

## User Flow

### For Registered Users:
1. Login/Register at `/auth`
2. Add pet profiles at `/profile`
3. Choose consultation method:
   - **AI Chat**: Chat with AI assistant about pet health
   - **Video Call**: Direct video consultation
4. Pet information is auto-filled
5. View results and book veterinarian appointments

### For Guest Users:
1. Choose consultation method from home page:
   - **"Chat with AI Assistant"** - Conversational interface
   - **"Start Free Consultation"** - Direct video call
2. **No form required** - Instant access to both options
3. Complete consultation and view AI analysis
4. Book follow-up appointment with veterinarian if needed

## Routes

- `/` - Home page (login/guest options)
- `/auth` - Login/Register page
- `/profile` - User profile & pet management
- `/ai-chat` - AI consultation assistant (chat interface)
- `/booking` - Booking form (auto-filled for logged-in users)
- `/video-call` - Video consultation
- `/results` - Consultation results

## Tech Stack

- React 19
- React Router DOM
- Ant Design (UI Components)
- Vite (Build Tool)
- LocalStorage (Mock Authentication & Data Storage)

## Backend Server

The application includes a Node.js/Express backend server that provides:

### Features
- **JWT-based Authentication**: Secure user registration and login
- **SQLite Database**: Persistent storage for users, pets, conversations, and appointments
- **Gemini AI Integration**: Real-time AI chat responses
- **RESTful API**: Complete API for all application features
- **Rate Limiting**: Protection against abuse
- **CORS Support**: Secure cross-origin requests

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Chat:**
- `POST /api/chat` - Send message to AI (supports guest and authenticated users)

**Appointments:**
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:bookingId` - Get appointment details

**Users:**
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)

**Pets:**
- `GET /api/pets` - Get user's pets (authenticated)
- `POST /api/pets` - Add new pet (authenticated)
- `PUT /api/pets/:id` - Update pet (authenticated)
- `DELETE /api/pets/:id` - Delete pet (authenticated)

**Health:**
- `GET /api/health` - Server health check

### Environment Variables

Required environment variables (see `server/.env.example`):
- `GEMINI_API_KEY` - Google Gemini API key (required)
- `JWT_SECRET` - Secret key for JWT tokens (required)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `PORT` - Server port (default: 3001)
- `DATABASE_PATH` - SQLite database path (default: ./database/petcare.db)

## Debugging & Monitoring

### LLM Request/Response Logging

The application includes comprehensive logging for all AI (Gemini API) interactions. This helps debug performance issues and understand what's being sent to and received from the AI service.

**What gets logged:**
- Full request payload sent to Gemini API
- Conversation history and system prompts
- AI response text and metadata
- Token usage and performance metrics
- Error details with retry information

**To see logs:**
```bash
# Start the server (logs appear in console)
cd server
npm start

# In another terminal, test the chat
node test-llm-logging.js
```

**For detailed documentation:** See [LLM_LOGGING_GUIDE.md](./LLM_LOGGING_GUIDE.md)

**Log sections to look for:**
- `========== LLM REQUEST ==========` - What we send to AI
- `========== LLM RESPONSE ==========` - What we get back
- `========== LLM ERROR ==========` - Any errors that occur
- `Duration: XXXms` - Response time metrics

## Notes

- Backend server required for AI chat functionality
- Camera and microphone permissions required for video consultation
- Speech recognition works best in Chrome/Edge browsers
- Multi-language support: English, Chinese (中文), Swedish (Svenska)
