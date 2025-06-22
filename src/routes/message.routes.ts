import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  sendMessage,
  getDirectMessages,
  getGroupMessages,
  markMessagesAsRead,
  getUnreadDirectMessageCount,
  getUnreadGroupMessageCount,
  getRecentConversations,
  deleteMessage,
  getOnlineUsers,
  getUserStatus
} from '../controllers/message.controller';

const router = Router();

/**
 * Public route for API documentation
 * GET /api/messages/routes
 */
router.get('/routes', (req, res) => {
  const routes = [
    {
      method: 'GET',
      path: '/api/messages/routes',
      description: 'Get all message API routes documentation',
      authentication: 'Not required'
    },
    {
      method: 'POST',
      path: '/api/messages',
      description: 'Send a message (direct or group)',
      authentication: 'Required',
      body: {
        content: 'string (required) - Message content',
        receiver: 'string (optional) - Receiver user ID for direct messages',
        group: 'string (optional) - Group ID for group messages'
      },
      note: 'Either receiver or group must be provided, but not both'
    },
    {
      method: 'GET',
      path: '/api/messages/direct/:userId',
      description: 'Get direct messages between current user and specified user',
      authentication: 'Required',
      params: {
        userId: 'string (required) - Other user ID'
      },
      query: {
        page: 'number (optional) - Page number (default: 1)',
        limit: 'number (optional) - Messages per page (default: 50)'
      }
    },
    {
      method: 'GET',
      path: '/api/messages/group/:groupId',
      description: 'Get messages for a specific group',
      authentication: 'Required',
      params: {
        groupId: 'string (required) - Group ID'
      },
      query: {
        page: 'number (optional) - Page number (default: 1)',
        limit: 'number (optional) - Messages per page (default: 50)'
      }
    },
    {
      method: 'PUT',
      path: '/api/messages/read',
      description: 'Mark messages as read',
      authentication: 'Required',
      body: {
        messageIds: 'string[] (required) - Array of message IDs to mark as read'
      }
    },
    {
      method: 'GET',
      path: '/api/messages/unread/direct/:userId',
      description: 'Get unread message count for direct conversation',
      authentication: 'Required',
      params: {
        userId: 'string (required) - Other user ID'
      }
    },
    {
      method: 'GET',
      path: '/api/messages/unread/group/:groupId',
      description: 'Get unread message count for group',
      authentication: 'Required',
      params: {
        groupId: 'string (required) - Group ID'
      }
    },
    {
      method: 'GET',
      path: '/api/messages/conversations',
      description: 'Get recent conversations (direct and group)',
      authentication: 'Required',
      query: {
        limit: 'number (optional) - Number of conversations to return (default: 20)'
      }
    },
    {
      method: 'GET',
      path: '/api/messages/online-users',
      description: 'Get online users',
      authentication: 'Required'
    },
    {
      method: 'GET',
      path: '/api/messages/user-status/:userId',
      description: 'Get user status',
      authentication: 'Required',
      params: {
        userId: 'string (required) - User ID'
      }
    },
    {
      method: 'DELETE',
      path: '/api/messages/:messageId',
      description: 'Delete a message (only sender can delete)',
      authentication: 'Required',
      params: {
        messageId: 'string (required) - Message ID to delete'
      }
    }
  ];

  res.json({
    success: true,
    message: 'Message API routes documentation',
    data: {
      routes,
      totalRoutes: routes.length,
      baseUrl: '/api/messages'
    }
  });
});

// Apply authentication middleware to all routes below
router.use(protect);

/**
 * Message management routes
 */

// Send a message (direct or group)
router.post('/', sendMessage);

// Get direct messages between two users
router.get('/direct/:userId', getDirectMessages);

// Get group messages
router.get('/group/:groupId', getGroupMessages);

// Mark messages as read
router.put('/read', markMessagesAsRead);

// Get unread message counts
router.get('/unread/direct/:userId', getUnreadDirectMessageCount);
router.get('/unread/group/:groupId', getUnreadGroupMessageCount);

// Get recent conversations
router.get('/conversations', getRecentConversations);

// Get online users
router.get('/online-users', getOnlineUsers);

// Get user status
router.get('/user-status/:userId', getUserStatus);

// Delete a message
router.delete('/:messageId', deleteMessage);

export default router;