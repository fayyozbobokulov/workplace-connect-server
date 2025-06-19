import { z } from 'zod';

// Schema for getting notifications with query parameters
export const getNotificationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be a positive number' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 100, { 
      message: 'Limit must be between 1 and 100' 
    }),
  type: z
    .enum(['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system'])
    .optional(),
  isRead: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
});

// Schema for marking notifications as read
export const markAsReadSchema = z.object({
  notificationIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID format'))
    .min(1, 'At least one notification ID is required')
    .max(50, 'Cannot mark more than 50 notifications at once')
    .optional(),
  type: z
    .enum(['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system'])
    .optional(),
  markAll: z.boolean().optional()
}).refine(
  (data) => data.notificationIds || data.markAll || data.type,
  {
    message: 'Either notificationIds, markAll flag, or type must be provided'
  }
);

// Schema for deleting notifications
export const deleteNotificationsSchema = z.object({
  notificationIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID format'))
    .min(1, 'At least one notification ID is required')
    .max(50, 'Cannot delete more than 50 notifications at once')
    .optional(),
  type: z
    .enum(['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system'])
    .optional(),
  deleteAll: z.boolean().optional()
}).refine(
  (data) => data.notificationIds || data.deleteAll || data.type,
  {
    message: 'Either notificationIds, deleteAll flag, or type must be provided'
  }
);

// Schema for creating a custom notification (admin/system use)
export const createNotificationSchema = z.object({
  recipientId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid recipient ID format'),
  type: z
    .enum(['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system']),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message cannot exceed 500 characters'),
  data: z.record(z.any()).optional()
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type MarkAsReadRequest = z.infer<typeof markAsReadSchema>;
export type DeleteNotificationsRequest = z.infer<typeof deleteNotificationsSchema>;
export type CreateNotificationRequest = z.infer<typeof createNotificationSchema>;
