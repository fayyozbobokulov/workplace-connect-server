# Workplace Connect - Real-time Chat Application

A scalable and maintainable real-time chat application built with Express, MongoDB, TypeScript, and Socket.io.

## Features

- **User Authentication**
  - Signup
  - Login
  - Logout
  - JWT-based authentication

- **Real-time Messaging**
  - Direct messaging between users
  - Group messaging
  - Message read status

- **Group Management**
  - Create groups
  - Add/remove members
  - Admin privileges

## Tech Stack

- **Backend**
  - Express.js - Web framework
  - TypeScript - Type safety
  - MongoDB - Database
  - Mongoose - ODM
  - Socket.io - Real-time communication
  - Zod - Data validation
  - JWT - Authentication

## Project Structure

```
workplace-connect-server/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middlewares/    # Custom middleware functions
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── validations/    # Validation schemas
│   └── index.ts        # Application entry point
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose (for MongoDB)

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd workplace-connect-server
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://admin:password@localhost:27017/workplace-connect?authSource=admin
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

4. Start MongoDB using Docker Compose
   ```
   docker-compose up -d
   ```
   This will start MongoDB and MongoDB Express (web UI for MongoDB) in detached mode.
   - MongoDB will be available at: `mongodb://admin:password@localhost:27017`
   - MongoDB Express UI will be available at: `http://localhost:8081`

4. Start the development server
   ```
   npm run dev
   ```

5. Build for production
   ```
   npm run build
   ```

6. Start production server
   ```
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Groups
- `POST /api/groups` - Create a new group
- `GET /api/groups` - Get all groups for current user
- `GET /api/groups/:id` - Get a specific group
- `PUT /api/groups/:id` - Update a group
- `DELETE /api/groups/:id` - Delete a group
- `POST /api/groups/:id/members` - Add a member to a group
- `DELETE /api/groups/:id/members` - Remove a member from a group

### Messages
- `POST /api/messages` - Send a message (direct or group)
- `GET /api/messages/direct/:userId` - Get direct messages with a user
- `GET /api/messages/group/:groupId` - Get messages in a group
- `PUT /api/messages/read` - Mark messages as read

## Socket.io Events

### Client Events
- `join-group` - Join a group room
- `leave-group` - Leave a group room

### Server Events
- `direct-message` - New direct message
- `group-message` - New group message
- `user-status` - User online/offline status update

## License

ISC
