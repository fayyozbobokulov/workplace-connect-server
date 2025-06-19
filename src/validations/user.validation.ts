import { z } from 'zod';

/**
 * Validation schema for updating user profile
 */
export const updateUserProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .trim()
    .toLowerCase()
    .optional(),
  profilePicture: z
    .string()
    .url('Profile picture must be a valid URL')
    .optional()
    .or(z.literal('')) // Allow empty string to remove profile picture
}).refine((data) => {
  // At least one field must be provided for update
  return Object.keys(data).length > 0;
}, {
  message: 'At least one field must be provided for update'
});

/**
 * Validation schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password is too long'),
  confirmNewPassword: z
    .string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword']
});

/**
 * Validation schema for getting users with query parameters
 */
export const getUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 10)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim())
});
