import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  getFriendRequestById
} from '../controllers/friendRequest.controller';

const router = Router();

/**
 * @route   POST /api/friend-requests
 * @desc    Send a friend request
 * @access  Private
 * @body    { recipientId: string }
 * @example POST /api/friend-requests
 *          Content-Type: application/json
 *          Authorization: Bearer <token>
 *          {
 *            "recipientId": "64a1b2c3d4e5f6789012345a"
 *          }
 */
router.post('/', protect, sendFriendRequest);

/**
 * @route   GET /api/friend-requests
 * @desc    Get friend requests for the current user
 * @access  Private
 * @query   type?: 'sent' | 'received' (default: 'received')
 *          status?: 'pending' | 'accepted' | 'rejected' (default: 'pending')
 *          page?: number (default: 1)
 *          limit?: number (default: 20, max: 100)
 * @example GET /api/friend-requests?type=received&status=pending&page=1&limit=10
 *          Authorization: Bearer <token>
 */
router.get('/', protect, getFriendRequests);

/**
 * @route   GET /api/friend-requests/routes
 * @desc    Get API documentation for friend requests
 * @access  Public
 */
router.get('/routes', (req, res) => {
  res.json({
    title: 'Friend Request API Documentation',
    version: '1.0.0',
    description: 'Complete API for managing friend requests',
    endpoints: {
      'POST /api/friend-requests': {
        description: 'Send a friend request',
        auth: 'Required',
        body: { recipientId: 'string (ObjectId)' },
        responses: {
          201: 'Friend request sent successfully',
          400: 'Validation error or invalid recipient',
          409: 'Friend request already exists',
          404: 'Recipient not found'
        }
      },
      'GET /api/friend-requests': {
        description: 'Get friend requests with pagination and filtering',
        auth: 'Required',
        query: {
          type: 'sent | received (default: received)',
          status: 'pending | accepted | rejected (default: pending)',
          page: 'number (default: 1)',
          limit: 'number (default: 20, max: 100)'
        },
        responses: {
          200: 'List of friend requests with pagination'
        }
      },
      'GET /api/friend-requests/:id': {
        description: 'Get specific friend request by ID',
        auth: 'Required',
        params: { id: 'Friend request ObjectId' },
        responses: {
          200: 'Friend request details',
          404: 'Friend request not found',
          403: 'Access denied'
        }
      },
      'PUT /api/friend-requests/:id/accept': {
        description: 'Accept a friend request',
        auth: 'Required',
        params: { id: 'Friend request ObjectId' },
        responses: {
          200: 'Friend request accepted',
          404: 'Friend request not found or already processed'
        }
      },
      'PUT /api/friend-requests/:id/reject': {
        description: 'Reject a friend request',
        auth: 'Required',
        params: { id: 'Friend request ObjectId' },
        responses: {
          200: 'Friend request rejected',
          404: 'Friend request not found or already processed'
        }
      },
      'DELETE /api/friend-requests/:id': {
        description: 'Cancel a friend request (sender only)',
        auth: 'Required',
        params: { id: 'Friend request ObjectId' },
        responses: {
          200: 'Friend request cancelled',
          404: 'Friend request not found or cannot be cancelled'
        }
      }
    },
    examples: {
      sendFriendRequest: {
        method: 'POST',
        url: '/api/friend-requests',
        headers: { 'Authorization': 'Bearer <token>' },
        body: { recipientId: '64a1b2c3d4e5f6789012345a' }
      },
      getFriendRequests: {
        method: 'GET',
        url: '/api/friend-requests?type=received&status=pending&page=1&limit=10',
        headers: { 'Authorization': 'Bearer <token>' }
      }
    }
  });
});

/**
 * @route   GET /api/friend-requests/:id
 * @desc    Get a specific friend request by ID
 * @access  Private
 * @param   id - Friend request ID
 * @example GET /api/friend-requests/64a1b2c3d4e5f6789012345a
 *          Authorization: Bearer <token>
 */
router.get('/:id', protect, getFriendRequestById);

/**
 * @route   PUT /api/friend-requests/:id/accept
 * @desc    Accept a friend request
 * @access  Private
 * @param   id - Friend request ID
 * @example PUT /api/friend-requests/64a1b2c3d4e5f6789012345a/accept
 *          Authorization: Bearer <token>
 */
router.put('/:id/accept', protect, acceptFriendRequest);

/**
 * @route   PUT /api/friend-requests/:id/reject
 * @desc    Reject a friend request
 * @access  Private
 * @param   id - Friend request ID
 * @example PUT /api/friend-requests/64a1b2c3d4e5f6789012345a/reject
 *          Authorization: Bearer <token>
 */
router.put('/:id/reject', protect, rejectFriendRequest);

/**
 * @route   DELETE /api/friend-requests/:id
 * @desc    Cancel a friend request (only by sender)
 * @access  Private
 * @param   id - Friend request ID
 * @example DELETE /api/friend-requests/64a1b2c3d4e5f6789012345a
 *          Authorization: Bearer <token>
 */
router.delete('/:id', protect, cancelFriendRequest);

export default router;
