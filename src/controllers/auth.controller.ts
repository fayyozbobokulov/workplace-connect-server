import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { loginSchema, registerSchema } from '../validations/auth.validation';
import { ZodError } from 'zod';
import { IUser } from '../models/user.model';

const userRepository = new UserRepository();

/**
 * Generate JWT token for authenticated user
 * @param userId - User ID to include in token payload
 * @returns JWT token string
 */
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * Register a new user
 * @route POST /auth/signup
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate input data
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUserByEmail = await userRepository.findByEmail(validatedData.email);
    if (existingUserByEmail) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }
    
    // Create new user (password will be hashed by the pre-save hook in the model)
    const user = await userRepository.create({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      password: validatedData.password,
    }) as IUser;
    
    // Generate JWT token
    const token = generateToken(user._id.toString());
    
    // Return user data and token (excluding password)
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      token,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Authenticate user and get token
 * @route POST /auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate input data
    const validatedData = loginSchema.parse(req.body);
    
    // Find user by email
    const user = await userRepository.findByEmail(validatedData.email) as IUser | null;
    
    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(validatedData.password))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    
    // Generate JWT token
    const token = generateToken(user._id.toString());
    
    // Return user data and token (excluding password)
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      token,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }
    
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Get current user profile
 * @route GET /auth/profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // User is already attached to req by the protect middleware
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    res.json({
      _id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};