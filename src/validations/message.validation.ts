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

export type CreateMessageInput = z.infer<typeof createMessageSchema>;