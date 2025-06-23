import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { IUser } from '../models/user.model';
import { updateUserProfileSchema, changePasswordSchema, getUsersQuerySchema } from '../validations/user.validation';
import { deleteFile, generateFileUrl } from '../utils/fileUpload.util';
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
    const users = await userRepository.find(filter, '-password', {
      skip,
      limit,
      sort: { createdAt: -1 } // Sort by newest first
    });
    
    // Get total count for pagination
    const totalUsers = await userRepository.count(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    const response = {
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
    };
    
    res.json(response);
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

/**
 * Upload profile picture
 * @route POST /users/me/profile-picture
 */
export const uploadProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No profile picture uploaded' });
      return;
    }

    const file = req.file;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePictureUrl = generateFileUrl(file.filename, baseUrl);

    // Delete old profile picture if exists
    if (req.user.profilePictureMetadata?.filename) {
      await deleteFile(req.user.profilePictureMetadata.filename);
    }

    // Prepare profile picture metadata
    const profilePictureMetadata = {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date()
    };

    // Update user with new profile picture
    const updatedUser = await userRepository.updateProfile(req.user._id, {
      profilePicture: profilePictureUrl,
      profilePictureMetadata
    }) as IUser;

    if (!updatedUser) {
      // Clean up uploaded file if user update fails
      await deleteFile(file.filename);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl,
      metadata: {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: profilePictureMetadata.uploadedAt
      }
    });
  } catch (error) {
    // Clean up uploaded file if there's an error
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error while uploading profile picture' });
  }
};

/**
 * Delete profile picture
 * @route DELETE /users/me/profile-picture
 */
export const deleteProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.user.profilePictureMetadata?.filename) {
      res.status(404).json({ message: 'No profile picture found' });
      return;
    }

    // Delete the file from storage
    const fileDeleted = await deleteFile(req.user.profilePictureMetadata.filename);
    
    // Update user to remove profile picture data
    const updatedUser = await userRepository.updateProfile(req.user._id, {
      profilePicture: '',
      profilePictureMetadata: undefined
    }) as IUser;

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile picture deleted successfully',
      fileDeleted
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ message: 'Server error while deleting profile picture' });
  }
};
