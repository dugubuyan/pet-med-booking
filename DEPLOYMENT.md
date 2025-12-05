# Deployment Guide

## AI Pet Consultation Assistant

This guide covers deploying both the frontend (React + Vite) and backend (Node.js + Express) applications.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Production Checklist](#production-checklist)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Prerequisites

### Required Software
- Node.js 18+ and npm
- SQLite3
- Git
- A server or hosting platform (e.g., AWS, DigitalOcean, Heroku, Vercel)

### Required API Keys
- Google Gemini API key (get from https://ai.google.dev/)

---

## Backend Deployment

### 1. Server Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd pet-med-booking/server

# Install dependencies
npm install --production

# Create production environment file
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `server/.env` with your production values:

```env
PORT=3001
NODE_ENV=production
DATABASE_PATH=./database/petcare.db
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=<your-api-key>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:** Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Initialize Database

```bash
# The database will be automatically initialized on first run
# Or manually initialize:
node -e "const db = require('./database/dbInstance'); db.ensureInitialized().then(() => console.log('DB ready'))"
```

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Using PM2 (Recommended for production):**
```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start server.js --name pet-consultation-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 5. Verify Backend

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-21T12:00:00.000Z"
}
```

---

## Frontend Deployment

### 1. Build Configuration

```bash
cd pet-med-booking

# Install dependencies
npm install

# Create production build
npm run build
```

### 2. Configure API Endpoint

Update `src/services/apiService.js` to point to your production backend:

```javascript
const API_BASE_URL = process.env.VITE_API_URL || 'https://your-backend-domain.com';
```

Or set environment variable:
```bash
# .env.production
VITE_API_URL=https://your-backend-domain.com
```

### 3. Deploy Options

#### Option A: Static Hosting (Vercel, Netlify, etc.)

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option B: Traditional Server

```bash
# Build the app
npm run build

# Copy dist folder to your web server
scp -r dist/* user@server:/var/www/html/
```

#### Option C: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "5173"]
EXPOSE 5173
```

```bash
docker build -t pet-consultation-frontend .
docker run -p 5173:5173 pet-consultation-frontend
```

---

## Environment Variables

### Backend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `DATABASE_PATH` | SQLite database file path | No | ./database/petcare.db |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `JWT_EXPIRES_IN` | JWT token expiration | No | 7d |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | No | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |

### Frontend (.env.production)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

---

## Database Setup

### SQLite Database

The application uses SQLite for data storage. The database is automatically initialized on first run.

**Manual Initialization:**
```bash
cd server
sqlite3 database/petcare.db < database/schema.sql
```

**Backup Database:**
```bash
# Create backup
cp database/petcare.db database/petcare.db.backup

# Automated backup script
0 2 * * * cp /path/to/database/petcare.db /path/to/backups/petcare-$(date +\%Y\%m\%d).db
```

**Database Location:**
- Development: `server/database/petcare.db`
- Production: Configure via `DATABASE_PATH` environment variable

---

## Production Checklist

### Security
- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set NODE_ENV=production
- [ ] Review and adjust rate limiting settings
- [ ] Secure database file permissions (chmod 600)

### Performance
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Monitor API response times
- [ ] Configure appropriate rate limits

### Monitoring
- [ ] Set up error logging (e.g., Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up alerts for API failures
- [ ] Monitor database size and performance
- [ ] Track Gemini API usage and quotas

### Testing
- [ ] Test all API endpoints in production
- [ ] Verify authentication flows
- [ ] Test chat functionality
- [ ] Test appointment creation
- [ ] Verify email notifications (if implemented)

---

## Monitoring and Maintenance

### Health Check Endpoint

```bash
GET /api/health
```

Monitor this endpoint to ensure the server and database are operational.

### Logs

**View PM2 logs:**
```bash
pm2 logs pet-consultation-api
```

**View error logs:**
```bash
pm2 logs pet-consultation-api --err
```

### Database Maintenance

**Check database size:**
```bash
du -h server/database/petcare.db
```

**Vacuum database (optimize):**
```bash
sqlite3 server/database/petcare.db "VACUUM;"
```

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Backend
cd server
npm install
pm2 restart pet-consultation-api

# Frontend
cd ..
npm install
npm run build
# Deploy new build to hosting platform
```

---

## Troubleshooting

### Backend Issues

**Server won't start:**
- Check if port 3001 is available
- Verify all environment variables are set
- Check database file permissions
- Review logs: `pm2 logs`

**Database errors:**
- Ensure database directory exists
- Check file permissions
- Verify schema is initialized
- Try manual initialization

**API rate limit errors:**
- Check Gemini API quota
- Verify API key is valid
- Monitor usage at https://ai.dev/usage

### Frontend Issues

**API connection errors:**
- Verify VITE_API_URL is correct
- Check CORS configuration on backend
- Ensure backend is running and accessible
- Check browser console for errors

**Build failures:**
- Clear node_modules and reinstall
- Check Node.js version (18+)
- Verify all dependencies are installed

---

## Support

For issues or questions:
1. Check the logs first
2. Review this deployment guide
3. Check the API documentation
4. Contact the development team

---

## API Documentation

### Authentication Endpoints

**POST /api/auth/register**
- Register new user
- Body: `{ email, password, fullName, phone }`

**POST /api/auth/login**
- Login user
- Body: `{ email, password }`

### Chat Endpoints

**POST /api/chat**
- Send message to AI
- Body: `{ message, language, sessionId? }`
- Headers: `Authorization: Bearer <token>` (optional)

### Appointment Endpoints

**POST /api/appointments**
- Create appointment
- Body: `{ sessionId?, appointmentData }`

**GET /api/appointments/:bookingId**
- Get appointment details

### User Endpoints

**GET /api/users/profile**
- Get user profile
- Headers: `Authorization: Bearer <token>` (required)

**PUT /api/users/profile**
- Update user profile
- Headers: `Authorization: Bearer <token>` (required)
- Body: `{ fullName, phone }`

---

## License

[Your License Here]
