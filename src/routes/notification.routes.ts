import express, { Request, Response } from 'express';
import {
  getNotifications,
  getNotificationStats,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  getNotificationById,
  createNotification
} from '../controllers/notification.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @route GET /notifications/routes
 * @desc Get API documentation for notification routes
 * @access Private
 */
router.get('/routes', (req: Request, res: Response) => {
  const routes = [
    {
      method: 'GET',
      path: '/api/notifications',
      description: 'Get notifications with pagination and filtering',
      access: 'Private (Bearer Token Required)',
      parameters: 'page?, limit?, type?, isRead? (query parameters)',
      response: 'Paginated list of notifications with statistics'
    },
    {
      method: 'GET',
      path: '/api/notifications/stats',
      description: 'Get notification statistics',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Notification counts by type and read status'
    },
    {
      method: 'GET',
      path: '/api/notifications/unread-count',
      description: 'Get unread notifications count',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Count of unread notifications'
    },
    {
      method: 'GET',
      path: '/api/notifications/:id',
      description: 'Get specific notification by ID',
      access: 'Private (Bearer Token Required)',
      parameters: 'id (URL parameter)',
      response: 'Notification details'
    },
    {
      method: 'PUT',
      path: '/api/notifications/read',
      description: 'Mark specific notifications as read',
      access: 'Private (Bearer Token Required)',
      parameters: 'notificationIds[], type?, markAll? (request body)',
      response: 'Count of modified notifications'
    },
    {
      method: 'PUT',
      path: '/api/notifications/read-all',
      description: 'Mark all notifications as read',
      access: 'Private (Bearer Token Required)',
      parameters: 'type? (query parameter)',
      response: 'Count of modified notifications'
    },
    {
      method: 'DELETE',
      path: '/api/notifications',
      description: 'Delete notifications',
      access: 'Private (Bearer Token Required)',
      parameters: 'notificationIds[], type?, deleteAll? (request body)',
      response: 'Count of deleted notifications'
    },
    {
      method: 'POST',
      path: '/api/notifications',
      description: 'Create a notification (admin/system use)',
      access: 'Private (Bearer Token Required)',
      parameters: 'recipientId, type, title, message, data? (request body)',
      response: 'Created notification'
    }
  ];

  const examples = {
    getNotifications: {
      url: `${req.protocol}://${req.get('host')}/api/notifications?page=1&limit=10&type=friend_request&isRead=false`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    },
    markAsRead: {
      url: `${req.protocol}://${req.get('host')}/api/notifications/read`,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      },
      body: {
        notificationIds: ['64a1b2c3d4e5f6789012345a', '64a1b2c3d4e5f6789012345b']
      }
    },
    markAllAsRead: {
      url: `${req.protocol}://${req.get('host')}/api/notifications/read-all?type=friend_request`,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    },
    deleteNotifications: {
      url: `${req.protocol}://${req.get('host')}/api/notifications`,
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      },
      body: {
        type: 'friend_request'
      }
    },
    createNotification: {
      url: `${req.protocol}://${req.get('host')}/api/notifications`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      },
      body: {
        recipientId: '64a1b2c3d4e5f6789012345a',
        type: 'system',
        title: 'System Notification',
        message: 'This is a system notification',
        data: {
          priority: 'high'
        }
      }
    }
  };

  res.json({
    message: 'Notification API Routes',
    version: '1.0.0',
    routes,
    examples,
    notificationTypes: [
      'friend_request',
      'friend_accepted', 
      'friend_rejected',
      'message',
      'group_invite',
      'system'
    ],
    queryParameters: {
      page: 'Page number (default: 1)',
      limit: 'Items per page (default: 20, max: 100)',
      type: 'Filter by notification type',
      isRead: 'Filter by read status (true/false)'
    }
  });
});

/**
 * @route GET /notifications
 * @desc Get notifications with pagination and filtering
 * @access Private
 */
router.get('/', getNotifications);

/**
 * @route GET /notifications/stats
 * @desc Get notification statistics
 * @access Private
 */
router.get('/stats', getNotificationStats);

/**
 * @route GET /notifications/unread-count
 * @desc Get unread notifications count
 * @access Private
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route PUT /notifications/read
 * @desc Mark specific notifications as read
 * @access Private
 */
router.put('/read', markAsRead);

/**
 * @route PUT /notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all', markAllAsRead);

/**
 * @route DELETE /notifications
 * @desc Delete notifications
 * @access Private
 */
router.delete('/', deleteNotifications);

/**
 * @route GET /notifications/:id
 * @desc Get specific notification by ID
 * @access Private
 */
router.get('/:id', getNotificationById);

/**
 * @route POST /notifications
 * @desc Create a notification (admin/system use)
 * @access Private
 */
router.post('/', createNotification);

export default router;
