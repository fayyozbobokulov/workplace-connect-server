import mongoose from 'mongoose';
import Message, { IMessage } from '../models/message.model';
import User from '../models/user.model';
import Group from '../models/group.model';

export class MessageService {
  /**
   * Send a message (direct or group)
   */
  async sendMessage(
    senderId: mongoose.Types.ObjectId,
    content: string,
    receiverId?: mongoose.Types.ObjectId,
    groupId?: mongoose.Types.ObjectId
  ): Promise<IMessage> {
    // Validate that either receiver or group is provided
    if (!receiverId && !groupId) {
      throw new Error('Either receiver or group must be provided');
    }

    if (receiverId && groupId) {
      throw new Error('Message cannot have both receiver and group');
    }

    // If it's a direct message, validate receiver exists
    if (receiverId) {
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        throw new Error('Receiver not found');
      }
    }

    // If it's a group message, validate group exists and sender is a member
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if sender is a member of the group
      if (!group.members.includes(senderId)) {
        throw new Error('You are not a member of this group');
      }
    }

    // Create the message
    const message = await Message.create({
      content,
      sender: senderId,
      receiver: receiverId,
      group: groupId,
      readBy: [senderId] // Sender has read the message by default
    });

    // Populate sender information
    await message.populate('sender', 'firstName lastName profilePictureUrl');
    
    return message;
  }

  /**
   * Get messages for a direct conversation
   */
  async getDirectMessages(
    userId: mongoose.Types.ObjectId,
    otherUserId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    messages: IMessage[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Validate that the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      throw new Error('User not found');
    }

    const skip = (page - 1) * limit;

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
      .populate('sender', 'firstName lastName profilePictureUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Message.countDocuments({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      totalCount,
      hasMore: skip + messages.length < totalCount
    };
  }

  /**
   * Get messages for a group
   */
  async getGroupMessages(
    userId: mongoose.Types.ObjectId,
    groupId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    messages: IMessage[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Validate that the group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.members.includes(userId)) {
      throw new Error('You are not a member of this group');
    }

    const skip = (page - 1) * limit;

    // Get group messages
    const messages = await Message.find({ group: groupId })
      .populate('sender', 'firstName lastName profilePictureUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Message.countDocuments({ group: groupId });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      totalCount,
      hasMore: skip + messages.length < totalCount
    };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    userId: mongoose.Types.ObjectId,
    messageIds: mongoose.Types.ObjectId[]
  ): Promise<void> {
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        readBy: { $ne: userId }
      },
      {
        $addToSet: { readBy: userId }
      }
    );
  }

  /**
   * Get unread message count for direct conversations
   */
  async getUnreadDirectMessageCount(
    userId: mongoose.Types.ObjectId,
    otherUserId: mongoose.Types.ObjectId
  ): Promise<number> {
    return await Message.countDocuments({
      sender: otherUserId,
      receiver: userId,
      readBy: { $ne: userId }
    });
  }

  /**
   * Get unread message count for a group
   */
  async getUnreadGroupMessageCount(
    userId: mongoose.Types.ObjectId,
    groupId: mongoose.Types.ObjectId
  ): Promise<number> {
    return await Message.countDocuments({
      group: groupId,
      sender: { $ne: userId },
      readBy: { $ne: userId }
    });
  }

  /**
   * Get recent conversations for a user
   */
  async getRecentConversations(
    userId: mongoose.Types.ObjectId,
    limit: number = 20
  ): Promise<Array<{
    type: 'direct' | 'group';
    participant?: any;
    group?: any;
    lastMessage: IMessage;
    unreadCount: number;
  }>> {
    // Get recent direct messages
    const recentDirectMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId, receiver: { $exists: true } },
            { receiver: userId, sender: { $exists: true } }
          ]
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$sender', userId] },
                    { $not: { $in: [userId, '$readBy'] } }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'participant'
        }
      },
      {
        $unwind: '$participant'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'lastMessage.sender'
        }
      },
      {
        $unwind: '$lastMessage.sender'
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $limit: limit
      }
    ]);

    // Get recent group messages
    const recentGroupMessages = await Message.aggregate([
      {
        $match: {
          group: { $exists: true }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$group',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$sender', userId] },
                    { $not: { $in: [userId, '$readBy'] } }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: '_id',
          as: 'group'
        }
      },
      {
        $unwind: '$group'
      },
      {
        $match: {
          'group.members': userId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'lastMessage.sender'
        }
      },
      {
        $unwind: '$lastMessage.sender'
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $limit: limit
      }
    ]);

    // Combine and format results
    const conversations = [
      ...recentDirectMessages.map(conv => ({
        type: 'direct' as const,
        participant: {
          _id: conv.participant._id,
          firstName: conv.participant.firstName,
          lastName: conv.participant.lastName,
          profilePictureUrl: conv.participant.profilePictureUrl
        },
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      })),
      ...recentGroupMessages.map(conv => ({
        type: 'group' as const,
        group: {
          _id: conv.group._id,
          name: conv.group.name,
          description: conv.group.description
        },
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      }))
    ];

    // Sort by last message timestamp and limit
    return conversations
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Delete a message (only sender can delete)
   */
  async deleteMessage(
    messageId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== userId.toString()) {
      throw new Error('You can only delete your own messages');
    }

    await Message.findByIdAndDelete(messageId);
  }
}
