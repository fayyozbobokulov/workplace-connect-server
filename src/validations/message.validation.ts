import { z } from 'zod';
import mongoose from 'mongoose';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (value: string) => {
  return mongoose.Types.ObjectId.isValid(value);
};

export const createMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .trim(),
  receiver: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid receiver ID format'
    })
    .optional(),
  group: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid group ID format'
    })
    .optional()
}).refine(data => data.receiver || data.group, {
  message: 'Either receiver or group must be provided',
  path: ['receiver']
}).refine(data => !(data.receiver && data.group), {
  message: 'Message cannot have both receiver and group',
  path: ['group']
});

export const markMessagesAsReadSchema = z.object({
  messageIds: z
    .array(z.string().refine(isValidObjectId, {
      message: 'Invalid message ID format'
    }))
    .min(1, 'At least one message ID is required')
    .max(100, 'Cannot mark more than 100 messages at once')
});

export const messageIdSchema = z.object({
  messageId: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid message ID format'
    })
});

export const userIdSchema = z.object({
  userId: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid user ID format'
    })
});

export const groupIdSchema = z.object({
  groupId: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid group ID format'
    })
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type MarkMessagesAsReadInput = z.infer<typeof markMessagesAsReadSchema>;
export type MessageIdInput = z.infer<typeof messageIdSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type GroupIdInput = z.infer<typeof groupIdSchema>;