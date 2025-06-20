import express from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  addMembersByEmail,
  removeMember,
  deleteGroup,
  makeAdmin,
  removeAdmin
} from '../controllers/group.controller';

const router = express.Router();

/**
 * @route   GET /api/groups/routes
 * @desc    Get API documentation for group routes
 * @access  Public
 */
router.get('/routes', (req, res) => {
  res.json({
    message: 'Group API Routes Documentation',
    version: '1.0.0',
    endpoints: [
      {
        method: 'POST',
        path: '/api/groups',
        description: 'Create a new group with email-based member invitations',
        authentication: 'Required (JWT)',
        requestBody: {
          name: 'string (optional) - Group name (2-50 characters)',
          description: 'string (optional) - Group description (max 500 characters)',
          emails: 'string[] (required) - Array of member email addresses (1-50 emails)'
        },
        responses: {
          201: 'Group created successfully with all members',
          207: 'Group created with partial member success',
          400: 'Validation error or no members added',
          401: 'Authentication required'
        },
        example: {
          request: {
            name: 'Development Team',
            description: 'Our awesome development team',
            emails: ['user1@example.com', 'user2@example.com']
          },
          response: {
            success: true,
            message: 'Group created successfully with all members',
            data: {
              group: {
                _id: '64a1b2c3d4e5f6789012345a',
                name: 'Development Team',
                description: 'Our awesome development team',
                creator: '64a1b2c3d4e5f6789012345b',
                members: ['64a1b2c3d4e5f6789012345b', '64a1b2c3d4e5f6789012345c'],
                admins: ['64a1b2c3d4e5f6789012345b']
              },
              memberResults: {
                successful: [
                  { email: 'user1@example.com', userId: '64a1b2c3d4e5f6789012345c' }
                ],
                failed: [],
                summary: { total: 2, successful: 2, failed: 0 }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/groups',
        description: 'Get all groups for the current user',
        authentication: 'Required (JWT)',
        responses: {
          200: 'Groups retrieved successfully',
          401: 'Authentication required'
        }
      },
      {
        method: 'GET',
        path: '/api/groups/:id',
        description: 'Get group by ID',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID'
        },
        responses: {
          200: 'Group retrieved successfully',
          400: 'Invalid group ID format',
          401: 'Authentication required',
          403: 'Access denied - not a member',
          404: 'Group not found'
        }
      },
      {
        method: 'PUT',
        path: '/api/groups/:id',
        description: 'Update group information (admin only)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID'
        },
        requestBody: {
          name: 'string (optional) - New group name',
          description: 'string (optional) - New group description'
        },
        responses: {
          200: 'Group updated successfully',
          400: 'Validation error',
          401: 'Authentication required',
          403: 'Access denied - admin required',
          404: 'Group not found'
        }
      },
      {
        method: 'POST',
        path: '/api/groups/:id/members',
        description: 'Add members to group by email (admin only)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID'
        },
        requestBody: {
          emails: 'string[] (required) - Array of email addresses (1-20 emails)'
        },
        responses: {
          200: 'All members added successfully',
          207: 'Partial success',
          400: 'Validation error or no members added',
          401: 'Authentication required',
          403: 'Access denied - admin required',
          404: 'Group not found'
        }
      },
      {
        method: 'DELETE',
        path: '/api/groups/:id/members/:userId',
        description: 'Remove member from group (admin or self)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID',
          userId: 'string (required) - User ID to remove'
        },
        responses: {
          200: 'Member removed successfully',
          400: 'Invalid ID format',
          401: 'Authentication required',
          403: 'Access denied',
          404: 'Group not found'
        }
      },
      {
        method: 'DELETE',
        path: '/api/groups/:id',
        description: 'Delete group (creator only)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID'
        },
        responses: {
          200: 'Group deleted successfully',
          400: 'Invalid group ID format',
          401: 'Authentication required',
          403: 'Access denied - creator required',
          404: 'Group not found'
        }
      },
      {
        method: 'PUT',
        path: '/api/groups/:id/admins/:userId',
        description: 'Make user admin (creator only)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID',
          userId: 'string (required) - User ID to promote'
        },
        responses: {
          200: 'User promoted to admin successfully',
          400: 'Invalid ID format',
          401: 'Authentication required',
          403: 'Access denied - creator required',
          404: 'Group not found'
        }
      },
      {
        method: 'DELETE',
        path: '/api/groups/:id/admins/:userId',
        description: 'Remove admin privileges (creator only)',
        authentication: 'Required (JWT)',
        parameters: {
          id: 'string (required) - Group ID',
          userId: 'string (required) - Admin ID to demote'
        },
        responses: {
          200: 'Admin privileges removed successfully',
          400: 'Invalid ID format',
          401: 'Authentication required',
          403: 'Access denied - creator required',
          404: 'Group not found'
        }
      }
    ],
    notes: [
      'All endpoints except /routes require JWT authentication',
      'Group names are optional - auto-generated if not provided',
      'Email arrays support bulk operations with detailed success/failure reporting',
      'Only group admins can add members and update group info',
      'Only group creator can delete group, manage admin privileges',
      'Members can remove themselves from groups',
      'Group creator cannot be removed and always remains admin'
    ]
  });
});

// Apply authentication middleware to all routes except documentation
router.use(protect);

// Group CRUD operations
router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Member management
router.post('/:id/members', addMembersByEmail);
router.delete('/:id/members/:userId', removeMember);

// Admin management
router.put('/:id/admins/:userId', makeAdmin);
router.delete('/:id/admins/:userId', removeAdmin);

export default router;