import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from './config/database';
import SocketService from './services/socket.service';
import { requestLogger, errorLogger, securityLogger } from './middlewares/logger.middleware';
import { setSocketService } from './controllers/message.controller';
// import errorHandler from './middlewares/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import fileRoutes from './routes/file.routes';
import notificationRoutes from './routes/notification.routes';
import friendRequestRoutes from './routes/friendRequest.routes';
import groupRoutes from './routes/group.routes';
import messageRoutes from './routes/message.routes';
import mockRoutes from './routes/mock.routes';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io service
const socketService = new SocketService(server);

// Inject socket service into message controller
setSocketService(socketService);

// Logging middleware (should be first)
app.use(requestLogger);
app.use(securityLogger);

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure files directory exists
const filesDir = path.join(process.cwd(), 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
  console.log(`📁 Created files directory: ${filesDir}`);
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Demo route for mock API
app.get('/demo', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/mock-demo.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friend-requests', friendRequestRoutes);
app.use('/files', fileRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/mock', mockRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`💚 ${timestamp} | HEALTH CHECK | Server status requested`);
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`❌ ${timestamp} | 404 | Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
// app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`🚀 ${timestamp} | SERVER STARTED | Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Logging Configuration:`);
  console.log(`   - Request logging: ✅ Enabled`);
  console.log(`   - Security logging: ✅ Enabled`);
  console.log(`   - Error logging: ✅ Enabled`);
  console.log(`   - Detailed logging: ${process.env.LOG_DETAILED === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Request start logging: ${process.env.LOG_REQUESTS_START === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 ${timestamp} | UNHANDLED REJECTION | ${err.message}`);
  console.error(`📚 Stack: ${err.stack}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 ${timestamp} | UNCAUGHT EXCEPTION | ${err.message}`);
  console.error(`📚 Stack: ${err.stack}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  const timestamp = new Date().toISOString();
  console.log(`🛑 ${timestamp} | SIGTERM received | Shutting down gracefully`);
  server.close(() => {
    console.log(`✅ ${timestamp} | Server closed`);
    process.exit(0);
  });
});

export { socketService };
