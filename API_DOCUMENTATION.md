# API Documentation

## Base URL
```
Development: http://localhost:3001
Production: https://your-api-domain.com
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Health Check

#### GET /api/health
Check server and database health.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-21T12:00:00.000Z"
}
```

---

## Authentication Endpoints

### Register User

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "phone": "+1234567890"
}
```

**Validation Rules:**
- Email: Valid email format
- Password: Minimum 6 characters
- Full Name: 2-100 characters
- Phone: Valid phone format

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_1234567890_abc123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "+1234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "error": "Email already registered"
}
```

### Login User

#### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_1234567890_abc123",
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

---

## Chat Endpoints

### Send Message

#### POST /api/chat

Send a message to the AI assistant. Supports both guest and authenticated users.

**Headers:**
```
Authorization: Bearer <token> (optional - for authenticated users)
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "My dog has been coughing",
  "language": "en",
  "sessionId": "uuid-session-id",
  "userContext": {
    "petName": "Buddy",
    "petType": "dog"
  }
}
```

**Parameters:**
- `message` (required): User's message
- `language` (optional): Language code (en, zh, sv). Default: en
- `sessionId` (optional): Existing session ID for conversation continuity
- `userContext` (optional): Additional context about the user/pet

**Success Response (200):**
```json
{
  "success": true,
  "response": "I understand your dog has been coughing. Can you tell me more about...",
  "sessionId": "87be7b24-ddbe-481f-9ff4-25d59a0370bf",
  "conversationId": 123
}
```

**Error Response (400):**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Message is required",
      "param": "message"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "AI service rate limit exceeded. Please try again in a moment.",
  "timestamp": "2025-11-21T12:00:00.000Z"
}
```

---

## Appointment Endpoints

### Create Appointment

#### POST /api/appointments

Create a new appointment from conversation data.

**Headers:**
```
Authorization: Bearer <token> (optional)
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "87be7b24-ddbe-481f-9ff4-25d59a0370bf",
  "appointmentData": {
    "ownerName": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "petName": "Buddy",
    "petType": "dog",
    "petAge": "5",
    "petBreed": "Golden Retriever",
    "petWeight": "30",
    "symptoms": "Coughing and sneezing",
    "urgency": "medium"
  }
}
```

**Parameters:**
- `sessionId` (optional): Link appointment to conversation
- `appointmentData` (required): Appointment details
  - `ownerName` (required): Owner's full name
  - `phone` (required): Contact phone number
  - `email` (required): Valid email address
  - `petName` (required): Pet's name
  - `petType` (required): Type of pet (dog, cat, bird, etc.)
  - `petAge` (optional): Pet's age
  - `petBreed` (optional): Pet's breed
  - `petWeight` (optional): Pet's weight
  - `symptoms` (optional): Symptoms description
  - `urgency` (optional): Urgency level (low, medium, high)

**Success Response (201):**
```json
{
  "success": true,
  "bookingId": "PET-MI8SD61O9D0I",
  "message": "Appointment created successfully",
  "appointment": {
    "bookingId": "PET-MI8SD61O9D0I",
    "ownerName": "John Doe",
    "petName": "Buddy",
    "petType": "dog",
    "createdAt": "2025-11-21T12:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Owner name is required",
      "param": "appointmentData.ownerName"
    }
  ]
}
```

### Get Appointment

#### GET /api/appointments/:bookingId

Retrieve appointment details by booking ID.

**Parameters:**
- `bookingId` (path): Booking ID (e.g., PET-MI8SD61O9D0I)

**Success Response (200):**
```json
{
  "success": true,
  "appointment": {
    "id": 1,
    "bookingId": "PET-MI8SD61O9D0I",
    "conversationId": 123,
    "ownerName": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "petName": "Buddy",
    "petType": "dog",
    "petAge": "5",
    "petBreed": "Golden Retriever",
    "petWeight": "30",
    "symptoms": "Coughing and sneezing",
    "isGuest": false,
    "createdAt": "2025-11-21 12:00:00"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Appointment not found"
}
```

---

## User Endpoints

### Get User Profile

#### GET /api/users/profile

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <token> (required)
```

**Success Response (200):**
```json
{
  "id": "user_1234567890_abc123",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "pets": [
    {
      "id": 1,
      "name": "Buddy",
      "type": "dog",
      "age": "5",
      "breed": "Golden Retriever",
      "weight": "30",
      "createdAt": "2025-11-21 12:00:00"
    }
  ],
  "createdAt": "2025-11-21 12:00:00",
  "updatedAt": "2025-11-21 12:00:00"
}
```

**Error Response (401):**
```json
{
  "error": "Access denied. No token provided."
}
```

### Update User Profile

#### PUT /api/users/profile

Update current user's profile information.

**Headers:**
```
Authorization: Bearer <token> (required)
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Smith",
  "phone": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "id": "user_1234567890_abc123",
  "email": "user@example.com",
  "fullName": "John Smith",
  "phone": "+1234567890",
  "pets": [],
  "createdAt": "2025-11-21 12:00:00",
  "updatedAt": "2025-11-21 12:30:00"
}
```

---

## Pet Endpoints

### Get User's Pets

#### GET /api/pets

Get all pets for the authenticated user.

**Headers:**
```
Authorization: Bearer <token> (required)
```

**Success Response (200):**
```json
{
  "pets": [
    {
      "id": 1,
      "name": "Buddy",
      "type": "dog",
      "age": "5",
      "breed": "Golden Retriever",
      "weight": "30",
      "createdAt": "2025-11-21 12:00:00"
    }
  ]
}
```

### Add Pet

#### POST /api/pets

Add a new pet to user's profile.

**Headers:**
```
Authorization: Bearer <token> (required)
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Whiskers",
  "type": "cat",
  "age": "3",
  "breed": "Persian",
  "weight": "4"
}
```

**Success Response (201):**
```json
{
  "message": "Pet added successfully",
  "pet": {
    "id": 2,
    "name": "Whiskers",
    "type": "cat",
    "age": "3",
    "breed": "Persian",
    "weight": "4",
    "createdAt": "2025-11-21 12:00:00"
  }
}
```

### Update Pet

#### PUT /api/pets/:id

Update pet information.

**Headers:**
```
Authorization: Bearer <token> (required)
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Whiskers Jr",
  "age": "4"
}
```

**Success Response (200):**
```json
{
  "message": "Pet updated successfully",
  "pet": {
    "id": 2,
    "name": "Whiskers Jr",
    "type": "cat",
    "age": "4",
    "breed": "Persian",
    "weight": "4",
    "createdAt": "2025-11-21 12:00:00"
  }
}
```

### Delete Pet

#### DELETE /api/pets/:id

Delete a pet from user's profile.

**Headers:**
```
Authorization: Bearer <token> (required)
```

**Success Response (200):**
```json
{
  "message": "Pet deleted successfully"
}
```

---

## Error Responses

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (invalid token)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Window: 15 minutes (900,000ms)
- Max Requests: 100 per window

When rate limit is exceeded:
```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Testing

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User","phone":"+1234567890"}'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Chat:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"My dog is coughing","language":"en"}'
```

**Create Appointment:**
```bash
curl -X POST http://localhost:3001/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"appointmentData":{"ownerName":"John","phone":"+1234567890","email":"john@example.com","petName":"Buddy","petType":"dog"}}'
```

---

## Support

For API issues or questions, please refer to:
- [Deployment Guide](./DEPLOYMENT.md)
- [README](./README.md)
- [Testing Results](./TESTING_RESULTS.md)
