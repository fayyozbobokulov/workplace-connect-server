import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export default class SocketService {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
      }
    });

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
      console.log(`User connected: ${socket.userId}`);
      
      // Add socket to user's sockets
      if (socket.userId) {
        const userSockets = this.userSockets.get(socket.userId) || [];
        userSockets.push(socket.id);
        this.userSockets.set(socket.userId, userSockets);

        // Join user's personal room
        socket.join(socket.userId);
      }

      // Handle joining group rooms
      socket.on('join-group', (groupId: string) => {
        socket.join(`group:${groupId}`);
        console.log(`User ${socket.userId} joined group ${groupId}`);
      });

      // Handle leaving group rooms
      socket.on('leave-group', (groupId: string) => {
        socket.leave(`group:${groupId}`);
        console.log(`User ${socket.userId} left group ${groupId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        
        if (socket.userId) {
          // Remove socket from user's sockets
          const userSockets = this.userSockets.get(socket.userId) || [];
          const updatedSockets = userSockets.filter(id => id !== socket.id);
          
          if (updatedSockets.length > 0) {
            this.userSockets.set(socket.userId, updatedSockets);
          } else {
            this.userSockets.delete(socket.userId);
          }
        }
      });
    });
  }

  // Method to emit a direct message
  public emitDirectMessage(senderId: string, receiverId: string, message: any) {
    // Emit to sender's room
    this.io.to(senderId).emit('direct-message', message);
    
    // Emit to receiver's room
    this.io.to(receiverId).emit('direct-message', message);
  }

  // Method to emit a group message
  public emitGroupMessage(groupId: string, message: any) {
    this.io.to(`group:${groupId}`).emit('group-message', message);
  }

  // Method to emit user status changes
  public emitUserStatus(userId: string, status: 'online' | 'offline') {
    this.io.emit('user-status', { userId, status });
  }
}
