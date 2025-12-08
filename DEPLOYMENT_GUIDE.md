# Deployment Guide for Pet Medical Booking System

This guide will walk you through deploying the Pet Medical Booking System to your production server.

## Server Information
- **IP Address**: 206.189.55.21
- **Domain**: vet.atqta.com
- **Web Server**: Caddy
- **Frontend**: Static files served by Caddy
- **Backend**: Node.js Express server

## Prerequisites

Before starting, ensure your server has:
- Node.js (v18 or higher)
- npm
- Git
- Caddy (already configured)
- PM2 (for process management)

## Step 1: Connect to Server

```bash
ssh root@206.189.55.21
```

## Step 2: Install PM2 (if not already installed)

```bash
npm install -g pm2
```

## Step 3: Clone or Update Repository

If first time deployment:
```bash
cd /root
git clone https://github.com/dugubuyan/pet-med-booking.git
cd pet-med-booking
git checkout dialogue
```

If updating existing deployment:
```bash
cd /root/pet-med-booking
git fetch origin
git checkout dialogue
git pull origin dialogue
```

## Step 4: Install Dependencies

### Frontend Dependencies
```bash
npm install
```

### Backend Dependencies
```bash
cd server
npm install
cd ..
```

## Step 5: Configure Environment Variables

### Backend Environment (.env)
```bash
cd server
cp .env.example .env
nano .env
```

Update the `.env` file with the following content:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Gemini API
GEMINI_API_KEY=AIzaSyD2yBZxxFPGok0HDwo_aAp_72nFsnhIpDM

# Frontend URL (for CORS)
FRONTEND_URL=https://vet.atqta.com

# Database
DATABASE_PATH=./database/petcare.db

# JWT Authentication
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Note**: The JWT_SECRET is using the dev value. For better security in production, consider generating a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 6: Initialize Database

```bash
cd /root/pet-med-booking/server
node database/db.js
```

This will create the SQLite database and initialize the schema.

## Step 7: Build Frontend

```bash
cd /root/pet-med-booking
npm run build
```

This creates the production build in the `dist` folder.

## Step 8: Update Caddy Configuration

Edit Caddy configuration:
```bash
nano /etc/caddy/Caddyfile
```

Update the configuration to:
```
vet.atqta.com {
    root * /root/pet-med-booking/dist
    
    # Serve static files
    file_server
    
    # Proxy API requests to backend
    reverse_proxy /api/* localhost:3001
    
    # SPA fallback - serve index.html for all non-API routes
    try_files {path} /index.html
    
    # Logging
    log {
        output file /var/log/caddy/vet.log
        level INFO
    }
    
    # Security headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

Reload Caddy:
```bash
systemctl reload caddy
```

## Step 9: Start Backend with PM2

```bash
cd /root/pet-med-booking/server
pm2 start server.js --name pet-booking-api
pm2 save
pm2 startup
```

This will:
- Start the backend server
- Save the PM2 process list
- Configure PM2 to start on system boot

## Step 10: Verify Deployment

### Check Backend Status
```bash
pm2 status
pm2 logs pet-booking-api
```

### Check Backend Health
```bash
curl http://localhost:3001/api/health
```

### Check Frontend
Visit: https://vet.atqta.com

## Useful PM2 Commands

```bash
# View logs
pm2 logs pet-booking-api

# Restart backend
pm2 restart pet-booking-api

# Stop backend
pm2 stop pet-booking-api

# Monitor resources
pm2 monit

# View detailed info
pm2 info pet-booking-api
```

## Updating the Application

When you need to deploy updates:

```bash
# 1. Connect to server
ssh root@206.189.55.21

# 2. Navigate to project
cd /root/pet-med-booking

# 3. Pull latest changes
git fetch origin
git checkout dialogue
git pull origin dialogue

# 4. Install any new dependencies
npm install
cd server && npm install && cd ..

# 5. Rebuild frontend
npm run build

# 6. Restart backend
pm2 restart pet-booking-api

# 7. Reload Caddy (if config changed)
systemctl reload caddy
```

## Database Backup

Create regular backups of your database:

```bash
# Create backup
cp /root/pet-med-booking/server/database/petcare.db \
   /root/backups/petcare-$(date +%Y%m%d-%H%M%S).db

# Automated daily backup (add to crontab)
crontab -e
```

Add this line:
```
0 2 * * * cp /root/pet-med-booking/server/database/petcare.db /root/backups/petcare-$(date +\%Y\%m\%d).db
```

## Troubleshooting

### Backend not responding
```bash
pm2 logs pet-booking-api --lines 100
pm2 restart pet-booking-api
```

### Frontend not loading
```bash
# Check Caddy status
systemctl status caddy

# Check Caddy logs
tail -f /var/log/caddy/vet.log

# Verify dist folder exists
ls -la /root/pet-med-booking/dist
```

### Database errors
```bash
# Check database file permissions
ls -la /root/pet-med-booking/server/database/

# Reinitialize database (WARNING: This will delete all data)
cd /root/pet-med-booking/server
rm database/petcare.db
node database/db.js
```

### Port conflicts
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

## Security Checklist

- [ ] Strong JWT_SECRET set in server/.env
- [ ] GEMINI_API_KEY properly configured
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key authentication enabled
- [ ] Regular database backups scheduled
- [ ] PM2 configured to restart on system reboot
- [ ] Caddy auto-renewing SSL certificates
- [ ] Rate limiting configured in backend

## Monitoring

### Check Application Health
```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend
curl https://vet.atqta.com

# PM2 monitoring
pm2 monit
```

### Log Locations
- Backend logs: `pm2 logs pet-booking-api`
- Caddy logs: `/var/log/caddy/vet.log`
- System logs: `journalctl -u caddy`

## Support

For issues or questions, refer to:
- API Documentation: `API_DOCUMENTATION.md`
- README: `README.md`
- Server logs: `pm2 logs pet-booking-api`
