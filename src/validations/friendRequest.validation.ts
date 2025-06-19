import { z } from 'zod';

// Send friend request validation - now accepts array of emails
export const sendFriendRequestSchema = z.object({
  emails: z.array(z.string().email('Invalid email format')).min(1, 'At least one email is required').max(10, 'Maximum 10 emails allowed')
});

// Friend request ID parameter validation
export const friendRequestIdSchema = z.object({
  id: z.string().min(1, 'Friend request ID is required')
});

// Get friend requests query validation
export const getFriendRequestsQuerySchema = z.object({
  type: z.enum(['sent', 'received']).optional().default('received'),
  status: z.enum(['pending', 'accepted', 'rejected']).optional().default('pending'),
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val, 10), 100) : 20)
});

// Type exports for TypeScript
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type FriendRequestIdInput = z.infer<typeof friendRequestIdSchema>;
export type GetFriendRequestsQuery = z.infer<typeof getFriendRequestsQuerySchema>;
