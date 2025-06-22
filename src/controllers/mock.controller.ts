import { Request, Response } from 'express';
import User from '../models/user.model';
import Group from '../models/group.model';
import Message from '../models/message.model';

/**
 * Mock Data Controller
 * Provides endpoints to get mock data for frontend development
 */

/**
 * Get mock users for frontend development
 * @route GET /api/mock/users
 */
export const getMockUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({})
      .select('_id firstName lastName email profilePicture createdAt')
      .limit(20)
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((user: any) => ({
      _id: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.profilePicture,
      profilePicture: user.profilePicture,
      lastMessage: '',
      timestamp: '',
      online: Math.random() > 0.5 // Random online status for demo
    }));

    res.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('Get mock users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching mock users' 
    });
  }
};

/**
 * Get mock groups for frontend development
 * @route GET /api/mock/groups
 */
export const getMockGroups = async (req: Request, res: Response) => {
  try {
    const groups = await Group.find({})
      .populate('members', 'firstName lastName profilePicture')
      .populate('creator', 'firstName lastName')
      .limit(20)
      .sort({ createdAt: -1 });

    const formattedGroups = groups.map((group: any) => ({
      _id: group._id.toString(),
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      members: group.members.map((member: any) => ({
        _id: member._id.toString(),
        name: `${member.firstName} ${member.lastName}`,
        profilePicture: member.profilePicture
      })),
      creator: {
        _id: group.creator._id.toString(),
        name: `${group.creator.firstName} ${group.creator.lastName}`
      },
      lastMessage: '', // Mock field for frontend compatibility
      timestamp: '', // Mock field for frontend compatibility
      avatar: '👥' // Mock avatar for groups
    }));

    res.json({
      success: true,
      data: formattedGroups,
      count: formattedGroups.length
    });
  } catch (error) {
    console.error('Get mock groups error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching mock groups' 
    });
  }
};

/**
 * Get mock conversations (recent messages) for frontend development
 * @route GET /api/mock/conversations
 */
export const getMockConversations = async (req: Request, res: Response) => {
  try {
    // Get recent direct messages
    const directMessages = await Message.aggregate([
      {
        $match: {
          receiver: { $exists: true },
          group: { $exists: false }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$sender', '$receiver'] },
              { sender: '$sender', receiver: '$receiver' },
              { sender: '$receiver', receiver: '$sender' }
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.receiver',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      {
        $limit: 10
      }
    ]);

    // Get recent group messages
    const groupMessages = await Message.aggregate([
      {
        $match: {
          group: { $exists: true }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$group',
          lastMessage: { $first: '$$ROOT' }
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
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $limit: 10
      }
    ]);

    // Format direct conversations
    const directConversations = directMessages.map((conv: any) => {
      const sender = conv.sender[0];
      const receiver = conv.receiver[0];
      
      return {
        _id: conv._id,
        type: 'direct',
        participant: {
          _id: receiver._id.toString(),
          name: `${receiver.firstName} ${receiver.lastName}`,
          profilePicture: receiver.profilePicture
        },
        lastMessage: conv.lastMessage.content,
        timestamp: conv.lastMessage.timestamp,
        unreadCount: Math.floor(Math.random() * 5) // Random unread count for demo
      };
    });

    // Format group conversations
    const groupConversations = groupMessages.map((conv: any) => {
      const group = conv.group[0];
      const sender = conv.sender[0];
      
      return {
        _id: conv._id,
        type: 'group',
        participant: {
          _id: group._id.toString(),
          name: group.name,
          memberCount: group.members.length
        },
        lastMessage: conv.lastMessage.content,
        timestamp: conv.lastMessage.timestamp,
        unreadCount: Math.floor(Math.random() * 10) // Random unread count for demo
      };
    });

    const allConversations = [...directConversations, ...groupConversations]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: allConversations,
      count: allConversations.length
    });
  } catch (error) {
    console.error('Get mock conversations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching mock conversations' 
    });
  }
};

/**
 * Get database statistics for development
 * @route GET /api/mock/stats
 */
export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();
    const messageCount = await Message.countDocuments();

    const stats = {
      users: userCount,
      groups: groupCount,
      messages: messageCount,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching database stats' 
    });
  }
};
