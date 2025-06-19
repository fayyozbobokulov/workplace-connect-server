import mongoose, { Types } from 'mongoose';
import Notification, { INotification } from '../models/notification.model';
import { BaseRepository } from './base.repository';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    friend_request: number;
    friend_accepted: number;
    friend_rejected: number;
    message: number;
    group_invite: number;
    system: number;
  };
}

export class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }

  /**
   * Get notifications for a specific user with pagination and filtering
   */
  async getNotificationsByUser(
    userId: Types.ObjectId, 
    query: NotificationQuery = {}
  ): Promise<{
    notifications: INotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 20, type, isRead } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { recipient: userId };
    if (type) filter.type = type;
    if (typeof isRead === 'boolean') filter.isRead = isRead;

    // Get notifications with sender details
    const notifications = await this.model
      .find(filter)
      .populate('senderDetails')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await this.model.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    return {
      notifications: notifications as INotification[],
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: Types.ObjectId): Promise<NotificationStats> {
    const pipeline = [
      { $match: { recipient: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$isRead', false] }, 1, 0]
            }
          },
          friend_request: {
            $sum: {
              $cond: [{ $eq: ['$type', 'friend_request'] }, 1, 0]
            }
          },
          friend_accepted: {
            $sum: {
              $cond: [{ $eq: ['$type', 'friend_accepted'] }, 1, 0]
            }
          },
          friend_rejected: {
            $sum: {
              $cond: [{ $eq: ['$type', 'friend_rejected'] }, 1, 0]
            }
          },
          message: {
            $sum: {
              $cond: [{ $eq: ['$type', 'message'] }, 1, 0]
            }
          },
          group_invite: {
            $sum: {
              $cond: [{ $eq: ['$type', 'group_invite'] }, 1, 0]
            }
          },
          system: {
            $sum: {
              $cond: [{ $eq: ['$type', 'system'] }, 1, 0]
            }
          }
        }
      }
    ];

    const result = await this.model.aggregate(pipeline);
    
    if (result.length === 0) {
      return {
        total: 0,
        unread: 0,
        byType: {
          friend_request: 0,
          friend_accepted: 0,
          friend_rejected: 0,
          message: 0,
          group_invite: 0,
          system: 0
        }
      };
    }

    const stats = result[0];
    return {
      total: stats.total,
      unread: stats.unread,
      byType: {
        friend_request: stats.friend_request,
        friend_accepted: stats.friend_accepted,
        friend_rejected: stats.friend_rejected,
        message: stats.message,
        group_invite: stats.group_invite,
        system: stats.system
      }
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: Types.ObjectId, userId: Types.ObjectId): Promise<INotification | null> {
    return await this.model.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    ).populate('senderDetails');
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: Types.ObjectId, type?: string): Promise<{ modifiedCount: number }> {
    const filter: any = { recipient: userId, isRead: false };
    if (type) filter.type = type;

    const result = await this.model.updateMany(filter, { isRead: true });
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const result = await this.model.deleteOne({
      _id: notificationId,
      recipient: userId
    });
    return result.deletedCount > 0;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: Types.ObjectId, type?: string): Promise<{ deletedCount: number }> {
    const filter: any = { recipient: userId };
    if (type) filter.type = type;

    const result = await this.model.deleteMany(filter);
    return { deletedCount: result.deletedCount };
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    return await this.model.countDocuments({
      recipient: userId,
      isRead: false
    });
  }

  /**
   * Create a friend request notification
   */
  async createFriendRequestNotification(
    senderId: Types.ObjectId,
    recipientId: Types.ObjectId,
    friendRequestId: Types.ObjectId
  ): Promise<INotification> {
    return await (this.model as any).createFriendRequestNotification(
      senderId,
      recipientId,
      friendRequestId
    );
  }

  /**
   * Create a friend accepted notification
   */
  async createFriendAcceptedNotification(
    senderId: Types.ObjectId,
    recipientId: Types.ObjectId
  ): Promise<INotification> {
    return await (this.model as any).createFriendAcceptedNotification(
      senderId,
      recipientId
    );
  }

  /**
   * Create a friend rejected notification
   */
  async createFriendRejectedNotification(
    senderId: Types.ObjectId,
    recipientId: Types.ObjectId
  ): Promise<INotification> {
    return await (this.model as any).createFriendRejectedNotification(
      senderId,
      recipientId
    );
  }

  /**
   * Delete notifications related to a friend request
   */
  async deleteFriendRequestNotifications(friendRequestId: Types.ObjectId): Promise<void> {
    await this.model.deleteMany({
      'data.friendRequestId': friendRequestId
    });
  }
}
