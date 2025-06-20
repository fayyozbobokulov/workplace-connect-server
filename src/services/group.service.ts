import mongoose from 'mongoose';
import Group, { IGroup } from '../models/group.model';
import User from '../models/user.model';

export class GroupService {
  /**
   * Create a new group with email-based member invitations
   */
  async createGroup(
    creatorId: mongoose.Types.ObjectId, 
    name: string | undefined, 
    description: string | undefined, 
    emails: string[]
  ): Promise<{
    group: IGroup;
    successful: Array<{ email: string; userId: mongoose.Types.ObjectId }>;
    failed: Array<{ email: string; reason: string }>;
  }> {
    const successful: Array<{ email: string; userId: mongoose.Types.ObjectId }> = [];
    const failed: Array<{ email: string; reason: string }> = [];

    // Get creator's email to prevent adding self
    const creator = await User.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    // Generate group name if not provided
    const groupName = name || `Group by ${creator.firstName} ${creator.lastName}`;

    // Find users by email
    const memberIds: mongoose.Types.ObjectId[] = [creatorId]; // Always include creator

    for (const email of emails) {
      try {
        // Skip if trying to add creator's own email
        if (email === creator.email) {
          failed.push({ email, reason: 'Cannot add yourself to the group (you are already the creator)' });
          continue;
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          failed.push({ email, reason: 'User not found' });
          continue;
        }

        // Check if user is already in the list
        if (memberIds.some(id => id.toString() === user._id.toString())) {
          failed.push({ email, reason: 'User already added to group' });
          continue;
        }

        memberIds.push(new mongoose.Types.ObjectId(user._id.toString()));
        successful.push({ email, userId: new mongoose.Types.ObjectId(user._id.toString()) });
      } catch (error) {
        failed.push({ email, reason: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Create the group
    const group = await Group.create({
      name: groupName,
      description: description || '',
      creator: creatorId,
      members: memberIds,
      admins: [creatorId] // Only creator is admin initially
    });

    return { group, successful, failed };
  }

  /**
   * Get group by ID with populated members
   */
  async getGroupById(groupId: mongoose.Types.ObjectId): Promise<IGroup | null> {
    return await Group.findById(groupId)
      .populate('creator', 'firstName lastName email profilePictureUrl')
      .populate('members', 'firstName lastName email profilePictureUrl')
      .populate('admins', 'firstName lastName email profilePictureUrl');
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId: mongoose.Types.ObjectId): Promise<IGroup[]> {
    return await Group.find({
      members: userId
    })
      .populate('creator', 'firstName lastName email profilePictureUrl')
      .populate('members', 'firstName lastName email profilePictureUrl')
      .sort({ updatedAt: -1 });
  }

  /**
   * Update group information
   */
  async updateGroup(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    updates: { name?: string; description?: string }
  ): Promise<IGroup | null> {
    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.admins.includes(userId)) {
      throw new Error('Only group admins can update group information');
    }

    return await Group.findByIdAndUpdate(
      groupId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('creator', 'firstName lastName email profilePictureUrl')
      .populate('members', 'firstName lastName email profilePictureUrl')
      .populate('admins', 'firstName lastName email profilePictureUrl');
  }

  /**
   * Add members to group by email
   */
  async addMembersByEmail(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    emails: string[]
  ): Promise<{
    successful: Array<{ email: string; userId: mongoose.Types.ObjectId }>;
    failed: Array<{ email: string; reason: string }>;
  }> {
    const successful: Array<{ email: string; userId: mongoose.Types.ObjectId }> = [];
    const failed: Array<{ email: string; reason: string }> = [];

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.admins.includes(userId)) {
      throw new Error('Only group admins can add members');
    }

    for (const email of emails) {
      try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          failed.push({ email, reason: 'User not found' });
          continue;
        }

        // Check if user is already a member
        if (group.members.includes(new mongoose.Types.ObjectId(user._id.toString()))) {
          failed.push({ email, reason: 'User is already a member of this group' });
          continue;
        }

        // Add user to group
        group.members.push(new mongoose.Types.ObjectId(user._id.toString()));
        successful.push({ email, userId: new mongoose.Types.ObjectId(user._id.toString()) });
      } catch (error) {
        failed.push({ email, reason: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Save the updated group
    await group.save();

    return { successful, failed };
  }

  /**
   * Remove member from group
   */
  async removeMember(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    memberIdToRemove: mongoose.Types.ObjectId
  ): Promise<IGroup | null> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is admin or removing themselves
    const isAdmin = group.admins.includes(userId);
    const isRemovingSelf = userId.toString() === memberIdToRemove.toString();

    if (!isAdmin && !isRemovingSelf) {
      throw new Error('Only group admins can remove members, or members can remove themselves');
    }

    // Cannot remove the creator
    if (group.creator.toString() === memberIdToRemove.toString()) {
      throw new Error('Cannot remove the group creator');
    }

    // Remove from members and admins arrays
    group.members = group.members.filter(id => id.toString() !== memberIdToRemove.toString());
    group.admins = group.admins.filter(id => id.toString() !== memberIdToRemove.toString());

    await group.save();

    return await this.getGroupById(groupId);
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Only creator can delete the group
    if (group.creator.toString() !== userId.toString()) {
      throw new Error('Only the group creator can delete the group');
    }

    await Group.findByIdAndDelete(groupId);
  }

  /**
   * Make user admin
   */
  async makeAdmin(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    memberIdToPromote: mongoose.Types.ObjectId
  ): Promise<IGroup | null> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Only creator can make admins
    if (group.creator.toString() !== userId.toString()) {
      throw new Error('Only the group creator can make members admin');
    }

    // Check if user is a member
    if (!group.members.includes(memberIdToPromote)) {
      throw new Error('User is not a member of this group');
    }

    // Check if already admin
    if (group.admins.includes(memberIdToPromote)) {
      throw new Error('User is already an admin');
    }

    group.admins.push(memberIdToPromote);
    await group.save();

    return await this.getGroupById(groupId);
  }

  /**
   * Remove admin privileges
   */
  async removeAdmin(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    adminIdToRemove: mongoose.Types.ObjectId
  ): Promise<IGroup | null> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Only creator can remove admin privileges
    if (group.creator.toString() !== userId.toString()) {
      throw new Error('Only the group creator can remove admin privileges');
    }

    // Cannot remove creator's admin privileges
    if (group.creator.toString() === adminIdToRemove.toString()) {
      throw new Error('Cannot remove admin privileges from the group creator');
    }

    group.admins = group.admins.filter(id => id.toString() !== adminIdToRemove.toString());
    await group.save();

    return await this.getGroupById(groupId);
  }
}
