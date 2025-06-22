# Real-Time Messaging System Documentation

## Overview

The workplace-connect-server now supports real-time messaging through WebSockets using Socket.IO. This system provides instant message delivery, typing indicators, online status tracking, and message read receipts.

## Architecture

### Components

1. **SocketService** (`src/services/socket.service.ts`)
   - Manages WebSocket connections
   - Handles authentication
   - Routes real-time events
   - Tracks online users

2. **Message Controller** (`src/controllers/message.controller.ts`)
   - Enhanced with real-time capabilities
   - Maintains REST API compatibility
   - Integrates with SocketService

3. **Message Service** (`src/services/message.service.ts`)
   - Core messaging logic
   - Database operations
   - Message validation

## WebSocket Events

### Client → Server Events

#### Authentication
```javascript
// Connect with JWT token
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  content: 'Hello, world!',
  receiver: 'userId123', // For direct messages
  // OR
  group: 'groupId456'    // For group messages
});
```

#### Join/Leave Group
```javascript
// Join group for real-time messages
socket.emit('join-group', 'groupId123');

// Leave group
socket.emit('leave-group', 'groupId123');
```

#### Typing Indicators
```javascript
// Start typing (direct message)
socket.emit('typing-start', { receiverId: 'userId123' });

// Start typing (group message)
socket.emit('typing-start', { groupId: 'groupId456' });

// Stop typing
socket.emit('typing-stop', { receiverId: 'userId123' });
socket.emit('typing-stop', { groupId: 'groupId456' });
```

#### Mark Messages as Read
```javascript
socket.emit('mark-messages-read', {
  messageIds: ['messageId1', 'messageId2']
});
```

### Server → Client Events

#### Message Received
```javascript
// Direct message received
socket.on('direct-message', (message) => {
  console.log('New direct message:', message);
  /*
  {
    _id: 'messageId',
    text: 'Hello!',
    sender: {
      _id: 'senderId',
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: 'profile.jpg'
    },
    timestamp: '2024-01-01T12:00:00.000Z',
    isOwn: false
  }
  */
});

// Group message received
socket.on('group-message', (message) => {
  console.log('New group message:', message);
  // Same structure as direct message + groupId
});
```

#### Message Sent Confirmation
```javascript
socket.on('message-sent', (response) => {
  console.log('Message sent successfully:', response);
  /*
  {
    success: true,
    message: { /* message object with isOwn: true */ }
  }
  */
});
```

#### Typing Indicators
```javascript
socket.on('user-typing', (data) => {
  console.log('User is typing:', data);
  /*
  {
    userId: 'userId123',
    type: 'direct' | 'group',
    groupId?: 'groupId456' // Only for group typing
  }
  */
});

socket.on('user-stopped-typing', (data) => {
  console.log('User stopped typing:', data);
});
```

#### User Status
```javascript
socket.on('user-status', (data) => {
  console.log('User status changed:', data);
  /*
  {
    userId: 'userId123',
    status: 'online' | 'offline'
  }
  */
});
```

#### Group Events
```javascript
socket.on('user-joined-group', (data) => {
  console.log('User joined group:', data);
  /*
  {
    userId: 'userId123',
    groupId: 'groupId456'
  }
  */
});

socket.on('user-left-group', (data) => {
  console.log('User left group:', data);
});
```

#### Message Operations
```javascript
socket.on('message-deleted', (data) => {
  console.log('Message deleted:', data);
  /*
  {
    messageId: 'messageId123',
    groupId?: 'groupId456' // Only for group messages
  }
  */
});

socket.on('messages-marked-read', (data) => {
  console.log('Messages marked as read:', data);
  /*
  {
    messageIds: ['messageId1', 'messageId2'],
    readBy: 'userId123'
  }
  */
});
```

#### Error Handling
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  /*
  {
    message: 'Error description'
  }
  */
});
```

## REST API Integration

The system maintains full REST API compatibility. All messaging operations can be performed via both WebSocket events and HTTP requests.

### New REST Endpoints

#### Get Online Users
```http
GET /api/messages/online-users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Online users retrieved successfully",
  "data": {
    "onlineUsers": ["userId1", "userId2"],
    "count": 2
  }
}
```

#### Check User Status
```http
GET /api/messages/user-status/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "User status retrieved successfully",
  "data": {
    "userId": "userId123",
    "isOnline": true,
    "status": "online"
  }
}
```

## Frontend Integration Example

### Basic Setup
```javascript
import io from 'socket.io-client';

class MessagingService {
  constructor(token) {
    this.socket = io('ws://localhost:5000', {
      auth: { token }
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Message events
    this.socket.on('direct-message', this.handleDirectMessage.bind(this));
    this.socket.on('group-message', this.handleGroupMessage.bind(this));
    this.socket.on('message-sent', this.handleMessageSent.bind(this));
    
    // Typing events
    this.socket.on('user-typing', this.handleUserTyping.bind(this));
    this.socket.on('user-stopped-typing', this.handleUserStoppedTyping.bind(this));
    
    // Status events
    this.socket.on('user-status', this.handleUserStatus.bind(this));
    
    // Error handling
    this.socket.on('error', this.handleError.bind(this));
  }
  
  // Send message
  sendMessage(content, receiverId = null, groupId = null) {
    this.socket.emit('send-message', {
      content,
      receiver: receiverId,
      group: groupId
    });
  }
  
  // Join group
  joinGroup(groupId) {
    this.socket.emit('join-group', groupId);
  }
  
  // Start typing
  startTyping(receiverId = null, groupId = null) {
    this.socket.emit('typing-start', {
      receiverId,
      groupId
    });
  }
  
  // Event handlers
  handleDirectMessage(message) {
    // Update UI with new direct message
    console.log('New direct message:', message);
  }
  
  handleGroupMessage(message) {
    // Update UI with new group message
    console.log('New group message:', message);
  }
  
  handleUserTyping(data) {
    // Show typing indicator
    console.log('User typing:', data);
  }
  
  handleError(error) {
    // Handle errors
    console.error('Socket error:', error);
  }
}

// Usage
const messagingService = new MessagingService(userToken);
```

### React Hook Example
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useMessaging = (token) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  useEffect(() => {
    if (!token) return;
    
    const newSocket = io('ws://localhost:5000', {
      auth: { token }
    });
    
    // Message events
    newSocket.on('direct-message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    newSocket.on('group-message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    // Typing events
    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => [...prev, data.userId]);
    });
    
    newSocket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    });
    
    // Status events
    newSocket.on('user-status', (data) => {
      if (data.status === 'online') {
        setOnlineUsers(prev => [...prev, data.userId]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [token]);
  
  const sendMessage = (content, receiverId, groupId) => {
    if (socket) {
      socket.emit('send-message', { content, receiver: receiverId, group: groupId });
    }
  };
  
  const joinGroup = (groupId) => {
    if (socket) {
      socket.emit('join-group', groupId);
    }
  };
  
  return {
    socket,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    joinGroup
  };
};
```

## Security Features

1. **JWT Authentication**: All WebSocket connections require valid JWT tokens
2. **Group Membership Validation**: Users can only join groups they're members of
3. **Message Access Control**: Users can only delete their own messages
4. **Input Validation**: All incoming data is validated using Zod schemas
5. **Error Handling**: Comprehensive error handling with meaningful messages

## Performance Considerations

1. **Connection Management**: Efficient tracking of user connections
2. **Room-based Broadcasting**: Messages sent only to relevant users
3. **Memory Management**: Proper cleanup on disconnection
4. **Database Optimization**: Minimal database queries for real-time operations

## Deployment Notes

1. **Environment Variables**: Ensure `CLIENT_URL` is set for CORS
2. **Load Balancing**: Consider Redis adapter for multiple server instances
3. **Monitoring**: Log all socket events for debugging
4. **Rate Limiting**: Implement rate limiting for message sending

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check JWT token validity and server URL
2. **Messages Not Received**: Verify group membership and socket connection
3. **Typing Indicators Not Working**: Ensure proper event emission
4. **Memory Leaks**: Check for proper event listener cleanup

### Debug Mode
```javascript
// Enable debug mode
localStorage.debug = 'socket.io-client:socket';

// Check connection status
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);
```

This real-time messaging system provides a robust foundation for instant communication with comprehensive features for modern messaging applications.
