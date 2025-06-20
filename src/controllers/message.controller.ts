import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { MessageService } from '../services/message.service';
import { createMessageSchema, CreateMessageInput } from '../validations/message.validation';

const messageService = new MessageService();

/**
 * Send a message (direct or group)
 * POST /api/messages
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, receiver, group } = createMessageSchema.parse(req.body);
    const senderId = new mongoose.Types.ObjectId(req.user._id);

    const receiverId = receiver ? new mongoose.Types.ObjectId(receiver) : undefined;
    const groupId = group ? new mongoose.Types.ObjectId(group) : undefined;

    const message = await messageService.sendMessage(senderId, content, receiverId, groupId);

    // Format response to match frontend interface
    const formattedMessage = {
      _id: message._id.toString(),
      text: message.content,
      sender: {
        _id: message.sender._id.toString(),
        firstName: (message.sender as any).firstName,
        lastName: (message.sender as any).lastName,
        profilePicture: (message.sender as any).profilePictureUrl
      },
      timestamp: message.createdAt.toISOString(),
      isOwn: true // Since the sender is sending the message
    };

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: formattedMessage }
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
      if (error.message.includes('not found') || 
          error.message.includes('not a member')) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Either receiver or group') ||
          error.message.includes('cannot have both')) {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Get direct messages between two users
 * GET /api/messages/direct/:userId
 */
export const getDirectMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId: otherUserId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    // Validate other user ID
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ message: 'Invalid user ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const result = await messageService.getDirectMessages(
      userId,
      new mongoose.Types.ObjectId(otherUserId),
      parseInt(page as string),
      parseInt(limit as string)
    );

    // Format messages to match frontend interface
    const formattedMessages = result.messages.map(message => ({
      _id: message._id.toString(),
      text: message.content,
      sender: {
        _id: message.sender._id.toString(),
        firstName: (message.sender as any).firstName,
        lastName: (message.sender as any).lastName,
        profilePicture: (message.sender as any).profilePictureUrl
      },
      timestamp: message.createdAt.toISOString(),
      isOwn: message.sender._id.toString() === userId.toString()
    }));

    res.json({
      success: true,
      message: 'Direct messages retrieved successfully',
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: parseInt(page as string),
          totalCount: result.totalCount,
          hasMore: result.hasMore
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
};

/**
 * Get group messages
 * GET /api/messages/group/:groupId
 */
export const getGroupMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    // Validate group ID
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const result = await messageService.getGroupMessages(
      userId,
      new mongoose.Types.ObjectId(groupId),
      parseInt(page as string),
      parseInt(limit as string)
    );

    // Format messages to match frontend interface
    const formattedMessages = result.messages.map(message => ({
      _id: message._id.toString(),
      text: message.content,
      sender: {
        _id: message.sender._id.toString(),
        firstName: (message.sender as any).firstName,
        lastName: (message.sender as any).lastName,
        profilePicture: (message.sender as any).profilePictureUrl
      },
      timestamp: message.createdAt.toISOString(),
      isOwn: message.sender._id.toString() === userId.toString()
    }));

    res.json({
      success: true,
      message: 'Group messages retrieved successfully',
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: parseInt(page as string),
          totalCount: result.totalCount,
          hasMore: result.hasMore
        }
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Group not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message === 'You are not a member of this group') {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};

/**
 * Mark messages as read
 * PUT /api/messages/read
 */
export const markMessagesAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ message: 'Message IDs array is required' });
      return;
    }

    // Validate all message IDs
    const validIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== messageIds.length) {
      res.status(400).json({ message: 'Invalid message ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));

    await messageService.markMessagesAsRead(userId, objectIds);

    res.json({
      success: true,
      message: 'Messages marked as read successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count for direct conversation
 * GET /api/messages/unread/direct/:userId
 */
export const getUnreadDirectMessageCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId: otherUserId } = req.params;

    // Validate other user ID
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ message: 'Invalid user ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const count = await messageService.getUnreadDirectMessageCount(
      userId,
      new mongoose.Types.ObjectId(otherUserId)
    );

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count for group
 * GET /api/messages/unread/group/:groupId
 */
export const getUnreadGroupMessageCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { groupId } = req.params;

    // Validate group ID
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      res.status(400).json({ message: 'Invalid group ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const count = await messageService.getUnreadGroupMessageCount(
      userId,
      new mongoose.Types.ObjectId(groupId)
    );

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent conversations
 * GET /api/messages/conversations
 */
export const getRecentConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = '20' } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const conversations = await messageService.getRecentConversations(
      userId,
      parseInt(limit as string)
    );

    // Format conversations for frontend
    const formattedConversations = conversations.map(conv => ({
      type: conv.type,
      participant: conv.participant,
      group: conv.group,
      lastMessage: {
        _id: conv.lastMessage._id.toString(),
        text: conv.lastMessage.content,
        sender: {
          _id: conv.lastMessage.sender._id.toString(),
          firstName: conv.lastMessage.sender.firstName,
          lastName: conv.lastMessage.sender.lastName,
          profilePicture: conv.lastMessage.sender.profilePictureUrl
        },
        timestamp: conv.lastMessage.createdAt.toISOString(),
        isOwn: conv.lastMessage.sender._id.toString() === userId.toString()
      },
      unreadCount: conv.unreadCount
    }));

    res.json({
      success: true,
      message: 'Recent conversations retrieved successfully',
      data: {
        conversations: formattedConversations,
        count: formattedConversations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message
 * DELETE /api/messages/:messageId
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400).json({ message: 'Invalid message ID format' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    await messageService.deleteMessage(new mongoose.Types.ObjectId(messageId), userId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Message not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message === 'You can only delete your own messages') {
        res.status(403).json({ message: error.message });
        return;
      }
    }

    next(error);
  }
};