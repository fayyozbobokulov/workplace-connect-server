import { Types } from 'mongoose';
import Group, { IGroup } from '../models/group.model';
import { BaseRepository, IBaseRepository } from './base.repository';

/**
 * Group Repository Interface
 * Extends the base repository with group-specific operations
 */
export interface IGroupRepository extends IBaseRepository<IGroup> {
  // Group-specific methods
  findByName(name: string): Promise<IGroup | null>;
  findByCreator(creatorId: string | Types.ObjectId): Promise<IGroup[]>;
  findByMember(memberId: string | Types.ObjectId): Promise<IGroup[]>;
  findByAdmin(adminId: string | Types.ObjectId): Promise<IGroup[]>;
  addMember(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null>;
  removeMember(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null>;
  addAdmin(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null>;
  removeAdmin(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null>;
}

/**
 * Group Repository Implementation
 * Implements group-specific database operations
 */
export class GroupRepository extends BaseRepository<IGroup> implements IGroupRepository {
  constructor() {
    super(Group);
  }

  /**
   * Find a group by name
   * @param name - Group name
   * @returns Promise resolving to group or null if not found
   */
  async findByName(name: string): Promise<IGroup | null> {
    return this.findOne({ name });
  }

  /**
   * Find groups created by a specific user
   * @param creatorId - Creator user ID
   * @returns Promise resolving to array of groups
   */
  async findByCreator(creatorId: string | Types.ObjectId): Promise<IGroup[]> {
    return this.find({ creator: creatorId });
  }

  /**
   * Find groups where a user is a member
   * @param memberId - Member user ID
   * @returns Promise resolving to array of groups
   */
  async findByMember(memberId: string | Types.ObjectId): Promise<IGroup[]> {
    return this.find({ members: memberId });
  }

  /**
   * Find groups where a user is an admin
   * @param adminId - Admin user ID
   * @returns Promise resolving to array of groups
   */
  async findByAdmin(adminId: string | Types.ObjectId): Promise<IGroup[]> {
    return this.find({ admins: adminId });
  }

  /**
   * Add a member to a group
   * @param groupId - Group ID
   * @param userId - User ID to add as member
   * @returns Promise resolving to updated group or null if not found
   */
  async addMember(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null> {
    return this.updateById(
      groupId,
      { $addToSet: { members: userId } }
    );
  }

  /**
   * Remove a member from a group
   * @param groupId - Group ID
   * @param userId - User ID to remove from members
   * @returns Promise resolving to updated group or null if not found
   */
  async removeMember(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null> {
    return this.updateById(
      groupId,
      { 
        $pull: { 
          members: userId,
          admins: userId  // Also remove from admins if they are an admin
        } 
      }
    );
  }

  /**
   * Add an admin to a group
   * @param groupId - Group ID
   * @param userId - User ID to add as admin
   * @returns Promise resolving to updated group or null if not found
   */
  async addAdmin(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null> {
    // First ensure the user is a member, then add as admin
    return this.updateById(
      groupId,
      { 
        $addToSet: { 
          members: userId,  // Ensure they're a member
          admins: userId 
        } 
      }
    );
  }

  /**
   * Remove an admin from a group (keeps them as a member)
   * @param groupId - Group ID
   * @param userId - User ID to remove from admins
   * @returns Promise resolving to updated group or null if not found
   */
  async removeAdmin(groupId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<IGroup | null> {
    return this.updateById(
      groupId,
      { $pull: { admins: userId } }
    );
  }
}
