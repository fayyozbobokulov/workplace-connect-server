import { Router } from 'express';
import { 
  getMockUsers, 
  getMockGroups, 
  getMockConversations, 
  getDatabaseStats 
} from '../controllers/mock.controller';

const router = Router();

/**
 * Mock Data Routes
 * Provides endpoints for frontend development and testing
 */

// Get mock users
router.get('/users', getMockUsers);

// Get mock groups
router.get('/groups', getMockGroups);

// Get mock conversations
router.get('/conversations', getMockConversations);

// Get database statistics
router.get('/stats', getDatabaseStats);

// API documentation
router.get('/routes', (req, res) => {
  res.json({
    message: 'Mock Data API Routes',
    version: '1.0.0',
    routes: {
      'GET /api/mock/users': {
        description: 'Get mock users for frontend development',
        response: 'Array of user objects with formatted data'
      },
      'GET /api/mock/groups': {
        description: 'Get mock groups for frontend development',
        response: 'Array of group objects with member information'
      },
      'GET /api/mock/conversations': {
        description: 'Get mock conversations (recent messages)',
        response: 'Array of conversation objects with last messages'
      },
      'GET /api/mock/stats': {
        description: 'Get database statistics',
        response: 'Object with counts of users, groups, and messages'
      }
    },
    note: 'These endpoints are for development and testing purposes'
  });
});

export default router;
