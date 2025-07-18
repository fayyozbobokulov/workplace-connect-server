import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { FriendRequestService } from '../services/friendRequest.service';
import { 
  sendFriendRequestSchema,
  friendRequestIdSchema,
  getFriendRequestsQuerySchema
} from '../validations/friendRequest.validation';
import mongoose from 'mongoose';

const friendRequestService = new FriendRequestService();

/**
 * Send friend requests to multiple users by email
 * POST /api/friend-requests
 */
export const sendFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { emails } = sendFriendRequestSchema.parse(req.body);
    const senderId = new mongoose.Types.ObjectId(req.user._id);

    const result = await friendRequestService.sendFriendRequestsByEmail(senderId, emails);

    // Determine response status based on results
    let status = 201; // Created
    if (result.successful.length === 0) {
      status = 400; // Bad Request - all failed
    } else if (result.failed.length > 0) {
      status = 207; // Multi-Status - partial success
    }

    res.status(status).json({
      success: result.successful.length > 0,
      message: result.successful.length === emails.length 
        ? 'All friend requests sent successfully'
        : result.successful.length === 0
        ? 'No friend requests were sent'
        : `${result.successful.length} of ${emails.length} friend requests sent successfully`,
      data: {
        successful: result.successful.map(item => {
          if ('type' in item && item.type === 'invitation') {
            return {
              email: item.email,
              type: 'invitation',
              message: item.message
            };
          } else if ('friendRequest' in item) {
            return {
              email: item.email,
              friendRequestId: item.friendRequest._id,
              recipient: item.friendRequest.recipient
            };
          } else {
            // This should never happen, but TypeScript requires it
            throw new Error('Invalid item type in successful results');
          }
        }),
        failed: result.failed,
        summary: {
          total: emails.length,
          successful: result.successful.length,
          failed: result.failed.length
        }
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};

/**
 * Accept a friend request
 * PUT /api/friend-requests/:id/accept
 */
export const acceptFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = friendRequestIdSchema.parse(req.params);

    // Validate friend request ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid friend request ID format' });
      return;
    }

    const friendRequest = await friendRequestService.acceptFriendRequest(
      new mongoose.Types.ObjectId(id),
      req.user._id
    );

    res.json({
      success: true,
      message: 'Friend request accepted successfully',
      data: { friendRequest }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Friend request not found or already processed') {
        res.status(404).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Reject a friend request
 * PUT /api/friend-requests/:id/reject
 */
export const rejectFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = friendRequestIdSchema.parse(req.params);

    // Validate friend request ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid friend request ID format' });
      return;
    }

    const friendRequest = await friendRequestService.rejectFriendRequest(
      new mongoose.Types.ObjectId(id),
      req.user._id
    );

    res.json({
      success: true,
      message: 'Friend request rejected successfully',
      data: { friendRequest }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Friend request not found or already processed') {
        res.status(404).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Cancel a friend request
 * DELETE /api/friend-requests/:id
 */
export const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = friendRequestIdSchema.parse(req.params);

    // Validate friend request ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid friend request ID format' });
      return;
    }

    const success = await friendRequestService.cancelFriendRequest(
      new mongoose.Types.ObjectId(id),
      req.user._id
    );

    if (!success) {
      res.status(404).json({ message: 'Friend request not found or cannot be cancelled' });
      return;
    }

    res.json({
      success: true,
      message: 'Friend request cancelled successfully'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};

/**
 * Get friend requests for the current user
 * GET /api/friend-requests
 */
export const getFriendRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getFriendRequestsQuerySchema.parse(req.query);

    const friendRequests = await friendRequestService.getFriendRequests(
      req.user._id,
      validatedQuery.type,
      validatedQuery.status
    );

    // Apply pagination
    const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
    const endIndex = startIndex + validatedQuery.limit;
    const paginatedRequests = friendRequests.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        friendRequests: paginatedRequests,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: friendRequests.length,
          pages: Math.ceil(friendRequests.length / validatedQuery.limit)
        },
        stats: {
          total: friendRequests.length,
          type: validatedQuery.type,
          status: validatedQuery.status
        }
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};

/**
 * Get a specific friend request by ID
 * GET /api/friend-requests/:id
 */
export const getFriendRequestById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = friendRequestIdSchema.parse(req.params);

    // Validate friend request ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid friend request ID format' });
      return;
    }

    const friendRequest = await friendRequestService.getFriendRequestById(
      new mongoose.Types.ObjectId(id)
    );

    if (!friendRequest) {
      res.status(404).json({ message: 'Friend request not found' });
      return;
    }

    // Check if user is involved in this friend request
    const userId = req.user._id.toString();
    const isInvolved = friendRequest.sender.toString() === userId || 
                      friendRequest.recipient.toString() === userId;

    if (!isInvolved) {
      res.status(403).json({ message: 'Access denied to this friend request' });
      return;
    }

    res.json({
      success: true,
      data: { friendRequest }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};
