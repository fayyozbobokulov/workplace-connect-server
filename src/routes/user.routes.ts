import express, { Request, Response } from 'express';
import { 
  getCurrentUser, 
  getUserById, 
  getUsers, 
  updateCurrentUser, 
  changePassword, 
  deleteCurrentUser,
  uploadProfilePicture,
  deleteProfilePicture
} from '../controllers/user.controller';
import { protect } from '../middlewares/auth.middleware';
import { uploadProfilePicture as uploadMiddleware } from '../utils/fileUpload.util';

const router = express.Router();

/**
 * @route GET /users/routes
 * @desc Get all available user API routes
 * @access Public
 */
router.get('/routes', (req: Request, res: Response) => {
  const routes = [
    {
      method: 'GET',
      path: '/api/users/routes',
      description: 'Get all available user API routes',
      access: 'Public',
      parameters: 'None',
      response: 'List of all available user routes'
    },
    {
      method: 'GET',
      path: '/api/users/me',
      description: 'Get current user profile',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Current user profile data'
    },
    {
      method: 'PUT',
      path: '/api/users/me',
      description: 'Update current user profile',
      access: 'Private (Bearer Token Required)',
      parameters: 'firstName?, lastName?, email?, profilePicture? (at least one required)',
      response: 'Updated user profile data'
    },
    {
      method: 'PUT',
      path: '/api/users/me/password',
      description: 'Change current user password',
      access: 'Private (Bearer Token Required)',
      parameters: 'currentPassword, newPassword, confirmNewPassword',
      response: 'Success message'
    },
    {
      method: 'DELETE',
      path: '/api/users/me',
      description: 'Delete current user account',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Success message'
    },
    {
      method: 'POST',
      path: '/api/users/me/profile-picture',
      description: 'Upload profile picture',
      access: 'Private (Bearer Token Required)',
      parameters: 'profilePicture (multipart/form-data file)',
      response: 'Profile picture URL and metadata'
    },
    {
      method: 'DELETE',
      path: '/api/users/me/profile-picture',
      description: 'Delete profile picture',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Success message'
    },
    {
      method: 'GET',
      path: '/api/users',
      description: 'Get all users with pagination and search',
      access: 'Private (Bearer Token Required)',
      parameters: 'page?, limit?, search? (query parameters)',
      response: 'Paginated list of users'
    },
    {
      method: 'GET',
      path: '/api/users/:id',
      description: 'Get user by ID',
      access: 'Private (Bearer Token Required)',
      parameters: 'id (URL parameter)',
      response: 'User profile data'
    }
  ];

  res.json({
    message: 'Available User API Routes',
    totalRoutes: routes.length,
    baseUrl: `${req.protocol}://${req.get('host')}`,
    routes: routes,
    documentation: {
      authentication: 'Use Bearer token in Authorization header for private routes',
      contentType: 'application/json',
      examples: {
        getCurrentUser: {
          url: `${req.protocol}://${req.get('host')}/api/users/me`,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
            'Content-Type': 'application/json'
          }
        },
        updateProfile: {
          url: `${req.protocol}://${req.get('host')}/api/users/me`,
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
            'Content-Type': 'application/json'
          },
          body: {
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@example.com',
            profilePicture: 'https://example.com/profile.jpg'
          }
        },
        changePassword: {
          url: `${req.protocol}://${req.get('host')}/api/users/me/password`,
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
            'Content-Type': 'application/json'
          },
          body: {
            currentPassword: 'oldpassword123',
            newPassword: 'newpassword123',
            confirmNewPassword: 'newpassword123'
          }
        },
        uploadProfilePicture: {
          url: `${req.protocol}://${req.get('host')}/api/users/me/profile-picture`,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
          },
          body: 'Form data with "profilePicture" file field (multipart/form-data)',
          note: 'Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB'
        },
        getUsers: {
          url: `${req.protocol}://${req.get('host')}/api/users?page=1&limit=10&search=john`,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
            'Content-Type': 'application/json'
          }
        }
      }
    }
  });
});

// Protected routes - require authentication
router.use(protect);

/**
 * @route GET /users/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', getCurrentUser);

/**
 * @route PUT /users/me
 * @desc Update current user profile
 * @access Private
 */
router.put('/me', updateCurrentUser);

/**
 * @route PUT /users/me/password
 * @desc Change current user password
 * @access Private
 */
router.put('/me/password', changePassword);

/**
 * @route DELETE /users/me
 * @desc Delete current user account
 * @access Private
 */
router.delete('/me', deleteCurrentUser);

/**
 * @route POST /users/me/profile-picture
 * @desc Upload profile picture
 * @access Private
 */
router.post('/me/profile-picture', uploadMiddleware.single('profilePicture'), uploadProfilePicture);

/**
 * @route DELETE /users/me/profile-picture
 * @desc Delete profile picture
 * @access Private
 */
router.delete('/me/profile-picture', deleteProfilePicture);

/**
 * @route GET /users
 * @desc Get all users with pagination and search
 * @access Private
 */
router.get('/', getUsers);

/**
 * @route GET /users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', getUserById);

export default router;
