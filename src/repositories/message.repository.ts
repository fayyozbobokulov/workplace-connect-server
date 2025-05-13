import { Types } from 'mongoose';
import Message, { IMessage } from '../models/message.model';
import { BaseRepository, IBaseRepository } from './base.repository';

/**
 * Message Repository Interface
 * Extends the base repository with message-specific operations
 */
export interface IMessageRepository extends IBaseRepository<IMessage> {
  // Message-specific methods
  findDirectMessages(senderId: string | Types.ObjectId, receiverId: string | Types.ObjectId): Promise<IMessage[]>;
  findGroupMessages(groupId: string | Types.ObjectId): Promise<IMessage[]>;
  findBySender(senderId: string | Types.ObjectId): Promise<IMessage[]>;
  findUnreadDirectMessages(receiverId: string | Types.ObjectId): Promise<IMessage[]>;
  markAsRead(messageId: string | Types.ObjectId): Promise<IMessage | null>;
  deleteAllUserMessages(userId: string | Types.ObjectId): Promise<number>;
}

/**
 * Message Repository Implementation
 * Implements message-specific database operations
 */
export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository {
  constructor() {
    super(Message);
  }

  /**
   * Find direct messages between two users
   * @param senderId - Sender user ID
   * @param receiverId - Receiver user ID
   * @returns Promise resolving to array of messages
   */
  async findDirectMessages(senderId: string | Types.ObjectId, receiverId: string | Types.ObjectId): Promise<IMessage[]> {
    return this.find({
      $or: [
        { sender: senderId, receiver: receiverId, isGroupMessage: false },
        { sender: receiverId, receiver: senderId, isGroupMessage: false }
      ]
    }, null, { sort: { createdAt: 1 } });
  }

  /**
   * Find all messages in a group
   * @param groupId - Group ID
   * @returns Promise resolving to array of messages
   */
  async findGroupMessages(groupId: string | Types.ObjectId): Promise<IMessage[]> {
    return this.find(
      { group: groupId, isGroupMessage: true },
      null,
      { sort: { createdAt: 1 } }
    );
  }

  /**
   * Find all messages sent by a user
   * @param senderId - Sender user ID
   * @returns Promise resolving to array of messages
   */
  async findBySender(senderId: string | Types.ObjectId): Promise<IMessage[]> {
    return this.find({ sender: senderId });
  }

  /**
   * Find all unread direct messages for a user
   * @param receiverId - Receiver user ID
   * @returns Promise resolving to array of messages
   */
  async findUnreadDirectMessages(receiverId: string | Types.ObjectId): Promise<IMessage[]> {
    return this.find({
      receiver: receiverId,
      isGroupMessage: false,
      isRead: false
    });
  }

  /**
   * Mark a message as read
   * @param messageId - Message ID
   * @returns Promise resolving to updated message or null if not found
   */
  async markAsRead(messageId: string | Types.ObjectId): Promise<IMessage | null> {
    return this.updateById(messageId, { isRead: true });
  }

  /**
   * Delete all messages sent by or received by a user
   * @param userId - User ID
   * @returns Promise resolving to number of messages deleted
   */
  async deleteAllUserMessages(userId: string | Types.ObjectId): Promise<number> {
    return this.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId, isGroupMessage: false }
      ]
    });
  }
  
  /**
   * Find the latest messages for each conversation a user is part of
   * (This is useful for displaying conversation previews)
   * @param userId - User ID
   * @returns Promise resolving to array of latest messages
   */
  async findLatestConversationMessages(userId: string | Types.ObjectId): Promise<any[]> {
    // This uses aggregation to get the latest message from each conversation
    return this.aggregate([
      // Match messages where the user is either sender or receiver
      {
        $match: {
          $or: [
            { sender: new Types.ObjectId(userId.toString()) },
            { receiver: new Types.ObjectId(userId.toString()), isGroupMessage: false }
          ]
        }
      },
      // Add a field to identify the conversation
      {
        $addFields: {
          conversationId: {
            $cond: {
              if: { $eq: ["$isGroupMessage", true] },
              then: "$group",
              else: {
                $cond: {
                  if: { $eq: ["$sender", new Types.ObjectId(userId.toString())] },
                  then: "$receiver",
                  else: "$sender"
                }
              }
            }
          }
        }
      },
      // Sort by creation date (descending)
      { $sort: { createdAt: -1 } },
      // Group by conversation and get the first (latest) message
      {
        $group: {
          _id: "$conversationId",
          messageId: { $first: "$_id" },
          sender: { $first: "$sender" },
          receiver: { $first: "$receiver" },
          group: { $first: "$group" },
          content: { $first: "$content" },
          isGroupMessage: { $first: "$isGroupMessage" },
          isRead: { $first: "$isRead" },
          createdAt: { $first: "$createdAt" }
        }
      },
      // Sort conversations by latest message date
      { $sort: { createdAt: -1 } }
    ]);
  }
}
