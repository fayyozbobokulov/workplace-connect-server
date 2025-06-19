import { Types } from 'mongoose';
import User, { IUser } from '../models/user.model';
import { BaseRepository, IBaseRepository } from './base.repository';

/**
 * User Repository Interface
 * Extends the base repository with user-specific operations
 */
export interface IUserRepository extends IBaseRepository<IUser> {
  // User-specific methods
  findByEmail(email: string): Promise<IUser | null>;
  updateProfile(userId: string | Types.ObjectId, profileData: Partial<IUser>): Promise<IUser | null>;
}

/**
 * User Repository Implementation
 * Implements user-specific database operations
 */
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email
   * @param email - User email
   * @returns Promise resolving to user or null if not found
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param profileData - Profile data to update
   * @returns Promise resolving to updated user or null if not found
   */
  async updateProfile(userId: string | Types.ObjectId, profileData: Partial<IUser>): Promise<IUser | null> {
    // Ensure password is not updated through this method
    const { password, ...safeProfileData } = profileData as any;
    
    return this.updateById(userId, safeProfileData as any);
  }
}
