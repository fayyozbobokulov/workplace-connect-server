import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { GroupService } from '../services/group.service';
import {
  createGroupSchema,
  updateGroupSchema,
  addMembersByEmailSchema,
  groupIdSchema,
} from '../validations/group.validation';

const groupService = new GroupService();

/**
 * Create a new group with email-based member invitations
 * POST /api/groups
 */
export const createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, emails } = createGroupSchema.parse(req.body);
    const creatorId = new mongoose.Types.ObjectId(req.user._id);

    const result = await groupService.createGroup(creatorId, name, description, emails);

    // Determine response status based on results
    let status = 201; // Created
    if (result.successful.length === 0) {
      status = 400; // Bad Request - no members added
    } else if (result.failed.length > 0) {
      status = 207; // Multi-Status - partial success
    }

    res.status(status).json({
      success: true,
      message: result.successful.length === emails.length 
        ? 'Group created successfully with all members'
        : result.successful.length === 0
        ? 'Group created but no members were added'
        : `Group created with ${result.successful.length} of ${emails.length} members added`,
      data: {
        group: result.group,
        memberResults: {
          successful: result.successful,
          failed: result.failed,
          summary: {
            total: emails.length,
            successful: result.successful.length,
            failed: result.failed.length
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};

/**
 * Get all groups for the current user
 * GET /api/groups
 */
export const getUserGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const groups = await groupService.getUserGroups(userId);

    res.json({
      success: true,
      message: 'Groups retrieved successfully',
      data: {
        groups,
        count: groups.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get group by ID
 * GET /api/groups/:id
 */
export const getGroupById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = groupIdSchema.parse(req.params);
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate group ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    const group = await groupService.getGroupById(new mongoose.Types.ObjectId(id));

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => member._id.toString() === userId.toString());
    if (!isMember) {
      res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
      return;
    }

    res.json({
      success: true,
      message: 'Group retrieved successfully',
      data: { group }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    next(error);
  }
};

/**
 * Update group information
 * PUT /api/groups/:id
 */
export const updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = groupIdSchema.parse(req.params);
    const updates = updateGroupSchema.parse(req.body);
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate group ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    const group = await groupService.updateGroup(
      new mongoose.Types.ObjectId(id),
      userId,
      updates
    );

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: { group }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message === 'Only group admins can update group information') {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Add members to group by email
 * POST /api/groups/:id/members
 */
export const addMembersByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = groupIdSchema.parse(req.params);
    const { emails } = addMembersByEmailSchema.parse(req.body);
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate group ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    const result = await groupService.addMembersByEmail(
      new mongoose.Types.ObjectId(id),
      userId,
      emails
    );

    // Determine response status based on results
    let status = 200; // OK
    if (result.successful.length === 0) {
      status = 400; // Bad Request - no members added
    } else if (result.failed.length > 0) {
      status = 207; // Multi-Status - partial success
    }

    res.status(status).json({
      success: result.successful.length > 0,
      message: result.successful.length === emails.length 
        ? 'All members added successfully'
        : result.successful.length === 0
        ? 'No members were added'
        : `${result.successful.length} of ${emails.length} members added successfully`,
      data: {
        successful: result.successful,
        failed: result.failed,
        summary: {
          total: emails.length,
          successful: result.successful.length,
          failed: result.failed.length
        }
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message === 'Only group admins can add members') {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Remove member from group
 * DELETE /api/groups/:id/members/:userId
 */
export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, userId: memberIdToRemove } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberIdToRemove)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }

    const group = await groupService.removeMember(
      new mongoose.Types.ObjectId(id),
      userId,
      new mongoose.Types.ObjectId(memberIdToRemove)
    );

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: { group }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Only group admins can remove members') || 
          error.message.includes('Cannot remove the group creator')) {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Delete group
 * DELETE /api/groups/:id
 */
export const deleteGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = groupIdSchema.parse(req.params);
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate group ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    await groupService.deleteGroup(new mongoose.Types.ObjectId(id), userId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message === 'Only the group creator can delete the group') {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Make user admin
 * PUT /api/groups/:id/admins/:userId
 */
export const makeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, userId: memberIdToPromote } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberIdToPromote)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }

    const group = await groupService.makeAdmin(
      new mongoose.Types.ObjectId(id),
      userId,
      new mongoose.Types.ObjectId(memberIdToPromote)
    );

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: { group }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Only the group creator can make members admin') ||
          error.message.includes('User is not a member') ||
          error.message.includes('User is already an admin')) {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Remove admin privileges
 * DELETE /api/groups/:id/admins/:userId
 */
export const removeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, userId: adminIdToRemove } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(adminIdToRemove)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }

    const group = await groupService.removeAdmin(
      new mongoose.Types.ObjectId(id),
      userId,
      new mongoose.Types.ObjectId(adminIdToRemove)
    );

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Admin privileges removed successfully',
      data: { group }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Only the group creator can remove admin privileges') ||
          error.message.includes('Cannot remove admin privileges from the group creator')) {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};