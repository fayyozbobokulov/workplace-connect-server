import express, { Request, Response } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @route GET /auth/routes
 * @desc Get all available API routes
 * @access Public
 */
router.get('/routes', (req: Request, res: Response) => {
  const routes = [
    {
      method: 'GET',
      path: '/api/auth/routes',
      description: 'Get all available API routes',
      access: 'Public',
      parameters: 'None',
      response: 'List of all available routes'
    },
    {
      method: 'POST',
      path: '/api/auth/signup',
      description: 'Register a new user',
      access: 'Public',
      parameters: 'firstName, lastName, email, password, confirmPassword',
      response: 'User data and JWT token'
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'Authenticate user & get token',
      access: 'Public',
      parameters: 'email, password',
      response: 'User data and JWT token'
    },
    {
      method: 'GET',
      path: '/api/auth/profile',
      description: 'Get current user profile',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Current user profile data'
    },
    {
      method: 'GET',
      path: '/health',
      description: 'Server health check',
      access: 'Public',
      parameters: 'None',
      response: 'Server status and uptime'
    },
    {
      method: 'GET',
      path: '/api/users/routes',
      description: 'Get all available user management routes',
      access: 'Public',
      parameters: 'None',
      response: 'List of all available user routes'
    },
    {
      method: 'GET',
      path: '/api/users/me',
      description: 'Get current user profile (detailed)',
      access: 'Private (Bearer Token Required)',
      parameters: 'None (Authorization header required)',
      response: 'Current user profile data'
    },
    {
      method: 'PUT',
      path: '/api/users/me',
      description: 'Update current user profile',
      access: 'Private (Bearer Token Required)',
      parameters: 'firstName?, lastName?, email?, profilePicture?',
      response: 'Updated user profile data'
    },
    {
      method: 'PUT',
      path: '/api/users/me/password',
      description: 'Change user password',
      access: 'Private (Bearer Token Required)',
      parameters: 'currentPassword, newPassword, confirmNewPassword',
      response: 'Success message'
    },
    {
      method: 'GET',
      path: '/api/users',
      description: 'Get all users with pagination',
      access: 'Private (Bearer Token Required)',
      parameters: 'page?, limit?, search? (query parameters)',
      response: 'Paginated list of users'
    }
  ];

  res.json({
    message: 'Available API Routes',
    totalRoutes: routes.length,
    baseUrl: `${req.protocol}://${req.get('host')}`,
    routes: routes,
    documentation: {
      authentication: 'Use Bearer token in Authorization header for private routes',
      contentType: 'application/json',
      example: {
        signup: {
          url: `${req.protocol}://${req.get('host')}/api/auth/signup`,
          method: 'POST',
          body: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password: 'securepassword123',
            confirmPassword: 'securepassword123'
          }
        },
        login: {
          url: `${req.protocol}://${req.get('host')}/api/auth/login`,
          method: 'POST',
          body: {
            email: 'john.doe@example.com',
            password: 'securepassword123'
          }
        },
        profile: {
          url: `${req.protocol}://${req.get('host')}/api/auth/profile`,
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

/**
 * @route POST /auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', register);

/**
 * @route POST /auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', login);

/**
 * @route GET /auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', protect, getProfile);

export default router;