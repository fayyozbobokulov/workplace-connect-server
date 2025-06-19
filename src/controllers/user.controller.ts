import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { IUser } from '../models/user.model';
import { updateUserProfileSchema, changePasswordSchema, getUsersQuerySchema } from '../validations/user.validation';
import bcrypt from 'bcrypt';

const userRepository = new UserRepository();

/**
 * Get current user profile (same as auth profile but in user context)
 * @route GET /users/me
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

/**
 * Get user by ID
 * @route GET /users/:id
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await userRepository.findById(id) as IUser | null;
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Return user data without password
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

/**
 * Get all users with pagination and search
 * @route GET /users
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate query parameters
    const validatedQuery = getUsersQuerySchema.parse(req.query);
    const { page, limit, search } = validatedQuery;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build search filter
    let filter: any = {};
    if (search) {
      filter = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Get users with pagination
    const users = await userRepository.find(filter, {
      skip,
      limit,
      select: '-password', // Exclude password field
      sort: { createdAt: -1 } // Sort by newest first
    });
    
    // Get total count for pagination
    const totalUsers = await userRepository.count(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      search: search || null
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }
    
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

/**
 * Update current user profile
 * @route PUT /users/me
 */
export const updateCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    // Validate input data
    const validatedData = updateUserProfileSchema.parse(req.body);
    
    // Check if email is being updated and if it's already in use
    if (validatedData.email && validatedData.email !== req.user.email) {
      const existingUser = await userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }
    
    // Update user profile
    const updatedUser = await userRepository.updateProfile(req.user._id, validatedData) as IUser;
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Return updated user data (excluding password)
    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      }
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
    
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

/**
 * Change user password
 * @route PUT /users/me/password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    // Validate input data
    const validatedData = changePasswordSchema.parse(req.body);
    
    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(validatedData.currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, salt);
    
    // Update password in database
    const updatedUser = await userRepository.updateById(req.user._id, { 
      password: hashedNewPassword 
    });
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({ 
      message: 'Password changed successfully' 
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
    
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
};

/**
 * Delete current user account
 * @route DELETE /users/me
 */
export const deleteCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    // Delete user account
    const deletedUser = await userRepository.deleteById(req.user._id);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({ 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ message: 'Server error while deleting account' });
  }
};
