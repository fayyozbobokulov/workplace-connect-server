import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const DB_NAME = process.env.DB_NAME || 'workplace-connect';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '27017';
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';

// Get MongoDB connection URI from environment variables or use default with Docker credentials
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;

// Configure mongoose options for optimal usage with repositories
mongoose.set('strictQuery', true); // Ensure strict schema validation
mongoose.set('toJSON', {
  virtuals: true, // Include virtuals when converting to JSON
  transform: (_, ret) => {
    delete ret.__v; // Remove version key from responses
    return ret;
  }
});

/**
 * Connect to MongoDB database with optimized settings for repository pattern
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      // Connection options optimized for production use
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 50, // Maintain up to 50 socket connections
    });
    
    console.log(`MongoDB connected successfully: ${connection.connection.host}`);
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    // Log when disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle process termination - close connection gracefully
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;

// Export the mongoose instance for use in repositories
export { mongoose };
