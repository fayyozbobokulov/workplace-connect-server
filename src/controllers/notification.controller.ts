import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { NotificationRepository } from '../repositories/notification.repository';
import { INotification } from '../models/notification.model';
import { 
  getNotificationsQuerySchema, 
  markAsReadSchema, 
  deleteNotificationsSchema,
  createNotificationSchema
} from '../validations/notification.validation';
import mongoose from 'mongoose';

const notificationRepository = new NotificationRepository();

/**
 * Get notifications for current user
 * @route GET /notifications
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Validate query parameters
    const validatedQuery = getNotificationsQuerySchema.parse(req.query);

    // Get notifications with pagination
    const result = await notificationRepository.getNotificationsByUser(
      req.user._id,
      validatedQuery
    );

    // Get notification statistics
    const stats = await notificationRepository.getNotificationStats(req.user._id);

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: result.pagination,
        stats
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

/**
 * Get notification statistics
 * @route GET /notifications/stats
 */
export const getNotificationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const stats = await notificationRepository.getNotificationStats(req.user._id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'Server error while fetching notification statistics' });
  }
};

/**
 * Get unread notifications count
 * @route GET /notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const count = await notificationRepository.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
};

/**
 * Mark notifications as read
 * @route PUT /notifications/read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Validate request body
    const validatedData = markAsReadSchema.parse(req.body);

    let result: { modifiedCount: number } = { modifiedCount: 0 };

    if (validatedData.markAll) {
      // Mark all notifications as read
      result = await notificationRepository.markAllAsRead(req.user._id, validatedData.type);
    } else if (validatedData.type) {
      // Mark all notifications of specific type as read
      result = await notificationRepository.markAllAsRead(req.user._id, validatedData.type);
    } else if (validatedData.notificationIds) {
      // Mark specific notifications as read
      let modifiedCount = 0;
      for (const notificationId of validatedData.notificationIds) {
        const notification = await notificationRepository.markAsRead(
          new mongoose.Types.ObjectId(notificationId),
          req.user._id
        );
        if (notification) modifiedCount++;
      }
      result = { modifiedCount };
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error while marking notifications as read' });
  }
};

/**
 * Mark all notifications as read
 * @route PUT /notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { type } = req.query;
    const notificationType = type as string | undefined;

    // Validate type if provided
    if (notificationType && !['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system'].includes(notificationType)) {
      res.status(400).json({ message: 'Invalid notification type' });
      return;
    }

    const result = await notificationRepository.markAllAsRead(req.user._id, notificationType);

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
};

/**
 * Delete notifications
 * @route DELETE /notifications
 */
export const deleteNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Validate request body
    const validatedData = deleteNotificationsSchema.parse(req.body);

    let result: { deletedCount: number } = { deletedCount: 0 };

    if (validatedData.deleteAll) {
      // Delete all notifications
      result = await notificationRepository.deleteAllNotifications(req.user._id, validatedData.type);
    } else if (validatedData.type) {
      // Delete all notifications of specific type
      result = await notificationRepository.deleteAllNotifications(req.user._id, validatedData.type);
    } else if (validatedData.notificationIds) {
      // Delete specific notifications
      let deletedCount = 0;
      for (const notificationId of validatedData.notificationIds) {
        const deleted = await notificationRepository.deleteNotification(
          new mongoose.Types.ObjectId(notificationId),
          req.user._id
        );
        if (deleted) deletedCount++;
      }
      result = { deletedCount };
    }

    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) deleted`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    console.error('Delete notifications error:', error);
    res.status(500).json({ message: 'Server error while deleting notifications' });
  }
};

/**
 * Get a specific notification by ID
 * @route GET /notifications/:id
 */
export const getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid notification ID format' });
      return;
    }

    const notification = await notificationRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      recipient: req.user._id
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Get notification by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching notification' });
  }
};

/**
 * Create a notification (admin/system use)
 * @route POST /notifications
 */
export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Validate request body
    const validatedData = createNotificationSchema.parse(req.body);

    const notification = await notificationRepository.create({
      recipient: new mongoose.Types.ObjectId(validatedData.recipientId),
      sender: req.user._id,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message,
      data: validatedData.data || {}
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error while creating notification' });
  }
};
