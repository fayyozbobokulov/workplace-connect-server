import { z } from 'zod';
import mongoose from 'mongoose';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (value: string) => {
  return mongoose.Types.ObjectId.isValid(value);
};

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(2, 'Group name must be at least 2 characters')
    .max(50, 'Group name cannot exceed 50 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  emails: z
    .array(z.string().email('Invalid email format'))
    .min(1, 'At least one email is required')
    .max(50, 'Maximum 50 emails allowed')
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(2, 'Group name must be at least 2 characters')
    .max(50, 'Group name cannot exceed 50 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
});

export const addMemberSchema = z.object({
  userId: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid user ID format'
    })
});

export const addMembersByEmailSchema = z.object({
  emails: z
    .array(z.string().email('Invalid email format'))
    .min(1, 'At least one email is required')
    .max(20, 'Maximum 20 emails allowed')
});

export const removeMemberSchema = z.object({
  userId: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid user ID format'
    })
});

export const groupIdSchema = z.object({
  id: z
    .string()
    .refine(isValidObjectId, {
      message: 'Invalid group ID format'
    })
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type AddMembersByEmailInput = z.infer<typeof addMembersByEmailSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type GroupIdInput = z.infer<typeof groupIdSchema>;