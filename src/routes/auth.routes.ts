import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

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