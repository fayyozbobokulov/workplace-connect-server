import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Group from '../models/group.model';
import { MessageService } from './message.service';
import { createMessageSchema } from '../validations/message.validation';
import mongoose from 'mongoose';

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export default class SocketService {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private messageService: MessageService;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
      }
    });

    this.messageService = new MessageService();
    this.setupSocketAuth();
    this.setupEventHandlers();
  }

  private setupSocketAuth() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: Token not provided'));
        }

        // Verify token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'fallback_secret'
        ) as { id: string };

        // Check if user exists
        const user = await User.findById(decoded.id);
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Attach user ID to socket
        socket.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User connected: ${socket.userId}`);
      
      // Add socket to user's sockets
      if (socket.userId) {
        const userSockets = this.userSockets.get(socket.userId) || [];
        userSockets.push(socket.id);
        this.userSockets.set(socket.userId, userSockets);

        // Join user's personal room
        socket.join(socket.userId);
        
        // Emit user online status
        this.emitUserStatus(socket.userId, 'online');
      }

      // Handle sending messages via WebSocket
      socket.on('send-message', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          // Validate message data
          const { content, receiver, group } = createMessageSchema.parse(data);
          const senderId = new mongoose.Types.ObjectId(socket.userId);

          const receiverId = receiver ? new mongoose.Types.ObjectId(receiver) : undefined;
          const groupId = group ? new mongoose.Types.ObjectId(group) : undefined;

          // Send message using service
          const message = await this.messageService.sendMessage(senderId, content, receiverId, groupId);

          // Format message for frontend
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
            isOwn: false // Will be set correctly for each recipient
          };

          // Emit message to appropriate recipients
          if (receiverId) {
            // Direct message
            this.emitDirectMessage(socket.userId, receiverId.toString(), formattedMessage);
          } else if (groupId) {
            // Group message
            this.emitGroupMessage(groupId.toString(), formattedMessage);
          }

          // Acknowledge to sender
          socket.emit('message-sent', {
            success: true,
            message: { ...formattedMessage, isOwn: true }
          });

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { 
            message: error instanceof Error ? error.message : 'Failed to send message' 
          });
        }
      });

      // Handle joining group rooms
      socket.on('join-group', async (groupId: string) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          // Verify user is a member of the group
          const group = await Group.findById(groupId);
          if (!group) {
            socket.emit('error', { message: 'Group not found' });
            return;
          }

          if (!group.members.includes(new mongoose.Types.ObjectId(socket.userId))) {
            socket.emit('error', { message: 'You are not a member of this group' });
            return;
          }

          socket.join(`group:${groupId}`);
          console.log(`👥 User ${socket.userId} joined group ${groupId}`);
          
          // Notify group members that user joined
          socket.to(`group:${groupId}`).emit('user-joined-group', {
            userId: socket.userId,
            groupId
          });

        } catch (error) {
          console.error('Error joining group:', error);
          socket.emit('error', { message: 'Failed to join group' });
        }
      });

      // Handle leaving group rooms
      socket.on('leave-group', (groupId: string) => {
        socket.leave(`group:${groupId}`);
        console.log(`👥 User ${socket.userId} left group ${groupId}`);
        
        // Notify group members that user left
        socket.to(`group:${groupId}`).emit('user-left-group', {
          userId: socket.userId,
          groupId
        });
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { receiverId?: string; groupId?: string }) => {
        if (data.receiverId) {
          // Direct message typing
          socket.to(data.receiverId).emit('user-typing', {
            userId: socket.userId,
            type: 'direct'
          });
        } else if (data.groupId) {
          // Group message typing
          socket.to(`group:${data.groupId}`).emit('user-typing', {
            userId: socket.userId,
            groupId: data.groupId,
            type: 'group'
          });
        }
      });

      socket.on('typing-stop', (data: { receiverId?: string; groupId?: string }) => {
        if (data.receiverId) {
          // Direct message typing stopped
          socket.to(data.receiverId).emit('user-stopped-typing', {
            userId: socket.userId,
            type: 'direct'
          });
        } else if (data.groupId) {
          // Group message typing stopped
          socket.to(`group:${data.groupId}`).emit('user-stopped-typing', {
            userId: socket.userId,
            groupId: data.groupId,
            type: 'group'
          });
        }
      });

      // Handle message read status
      socket.on('mark-messages-read', async (data: { messageIds: string[] }) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          const userId = new mongoose.Types.ObjectId(socket.userId);
          const objectIds = data.messageIds.map(id => new mongoose.Types.ObjectId(id));

          await this.messageService.markMessagesAsRead(userId, objectIds);

          // Emit read receipt to message senders
          // This could be enhanced to notify specific users
          socket.emit('messages-marked-read', {
            success: true,
            messageIds: data.messageIds
          });

        } catch (error) {
          console.error('Error marking messages as read:', error);
          socket.emit('error', { message: 'Failed to mark messages as read' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userId}`);
        
        if (socket.userId) {
          // Remove socket from user's sockets
          const userSockets = this.userSockets.get(socket.userId) || [];
          const updatedSockets = userSockets.filter(id => id !== socket.id);
          
          if (updatedSockets.length > 0) {
            this.userSockets.set(socket.userId, updatedSockets);
          } else {
            this.userSockets.delete(socket.userId);
            // Emit user offline status only if no more sockets
            this.emitUserStatus(socket.userId, 'offline');
          }
        }
      });
    });
  }

  // Method to emit a direct message
  public emitDirectMessage(senderId: string, receiverId: string, message: any) {
    // Emit to sender's room (with isOwn: true)
    this.io.to(senderId).emit('direct-message', { ...message, isOwn: true });
    
    // Emit to receiver's room (with isOwn: false)
    this.io.to(receiverId).emit('direct-message', { ...message, isOwn: false });
  }

  // Method to emit a group message
  public emitGroupMessage(groupId: string, message: any) {
    // Emit to all group members
    this.io.to(`group:${groupId}`).emit('group-message', {
      ...message,
      groupId
    });
  }

  // Method to emit user status changes
  public emitUserStatus(userId: string, status: 'online' | 'offline') {
    this.io.emit('user-status', { userId, status });
  }

  // Method to emit message deletion
  public emitMessageDeleted(messageId: string, receiverId?: string, groupId?: string) {
    if (receiverId) {
      // Direct message deletion
      this.io.to(receiverId).emit('message-deleted', { messageId });
    } else if (groupId) {
      // Group message deletion
      this.io.to(`group:${groupId}`).emit('message-deleted', { messageId, groupId });
    }
  }

  // Method to get online users
  public getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Method to check if user is online
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Method to get socket instance (for external use)
  public getIO(): Server {
    return this.io;
  }
}
