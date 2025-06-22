import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import User from '../src/models/user.model';
import Group from '../src/models/group.model';
import Message from '../src/models/message.model';
import FriendRequest from '../src/models/friendRequest.model';

/**
 * Comprehensive Database Seeding Script
 * Creates mock users, groups, messages, and friend requests
 */

// Mock users data
const mockUsers = [
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    email: 'emma.johnson@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    firstName: 'Noah',
    lastName: 'Brown',
    email: 'noah.brown@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/45.jpg'
  },
  {
    firstName: 'Ava',
    lastName: 'Davis',
    email: 'ava.davis@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/46.jpg'
  },
  {
    firstName: 'William',
    lastName: 'Garcia',
    email: 'william.garcia@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/47.jpg'
  },
  {
    firstName: 'Sophia',
    lastName: 'Martinez',
    email: 'sophia.martinez@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/48.jpg'
  },
  {
    firstName: 'James',
    lastName: 'Rodriguez',
    email: 'james.rodriguez@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/49.jpg'
  },
  {
    firstName: 'Isabella',
    lastName: 'Wilson',
    email: 'isabella.wilson@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/50.jpg'
  },
  {
    firstName: 'Benjamin',
    lastName: 'Anderson',
    email: 'benjamin.anderson@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/51.jpg'
  },
  {
    firstName: 'Mia',
    lastName: 'Thomas',
    email: 'mia.thomas@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/52.jpg'
  },
  {
    firstName: 'Lucas',
    lastName: 'Jackson',
    email: 'lucas.jackson@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/53.jpg'
  },
  {
    firstName: 'Charlotte',
    lastName: 'White',
    email: 'charlotte.white@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/54.jpg'
  },
  {
    firstName: 'Henry',
    lastName: 'Harris',
    email: 'henry.harris@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/55.jpg'
  },
  {
    firstName: 'Amelia',
    lastName: 'Martin',
    email: 'amelia.martin@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/56.jpg'
  },
  {
    firstName: 'Alexander',
    lastName: 'Thompson',
    email: 'alexander.thompson@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/men/57.jpg'
  },
  {
    firstName: 'Harper',
    lastName: 'Garcia',
    email: 'harper.garcia@workplace.com',
    password: 'Qwerty@123',
    profilePicture: 'https://randomuser.me/api/portraits/women/58.jpg'
  }
];

// Mock groups data
const mockGroups = [
  {
    name: 'Frontend Development Team',
    description: 'Team for frontend developers working on React and Vue.js projects'
  },
  {
    name: 'Backend Development Team',
    description: 'Team for backend developers working on Node.js and Python projects'
  },
  {
    name: 'Design Team',
    description: 'UI/UX designers and graphic designers collaboration space'
  },
  {
    name: 'Project Management',
    description: 'Project managers and team leads coordination group'
  },
  {
    name: 'Marketing Team',
    description: 'Marketing and social media team discussions'
  },
  {
    name: 'General Discussion',
    description: 'Company-wide general discussions and announcements'
  },
  {
    name: 'Tech Talk',
    description: 'Technical discussions and knowledge sharing'
  },
  {
    name: 'Random Chat',
    description: 'Casual conversations and fun discussions'
  }
];

// Sample messages for conversations
const sampleMessages = [
  "Hey everyone! How's the project coming along?",
  "I just finished implementing the new feature. Ready for review!",
  "Great work on the presentation today!",
  "Can we schedule a meeting for tomorrow?",
  "The client feedback looks positive ",
  "I found a bug in the payment system. Working on a fix.",
  "Coffee break anyone? ",
  "The new design looks amazing!",
  "Don't forget about the deadline next week",
  "I'll be working from home tomorrow",
  "Thanks for the help with the database issue!",
  "The server deployment was successful ",
  "Let's celebrate the successful launch! ",
  "I need some help with the authentication flow",
  "The performance improvements are working great!",
  "Meeting notes have been shared in the drive",
  "New team member joining us next Monday",
  "The client wants to add another feature",
  "Code review completed. Looks good to merge!",
  "Weekend plans anyone? "
];

/**
 * Connect to MongoDB
 */
async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workplace-connect');
    console.log(' Connected to MongoDB');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Clear existing data
 */
async function clearData(): Promise<void> {
  try {
    await User.deleteMany({});
    await Group.deleteMany({});
    await Message.deleteMany({});
    await FriendRequest.deleteMany({});
    console.log(' Cleared existing data');
  } catch (error) {
    console.error(' Error clearing data:', error);
    throw error;
  }
}

/**
 * Create mock users
 */
async function createUsers(): Promise<any[]> {
  try {
    const users: any[] = [];
    const defaultPassword = 'Qwerty@123'; // Default password for all mock users
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    for (const userData of mockUsers) {
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        profilePicture: userData.profilePicture,
        isEmailVerified: true // Skip email verification for mock data
      });
      
      const savedUser = await user.save();
      users.push(savedUser);
    }
    
    console.log(` Created ${users.length} mock users`);
    return users;
  } catch (error) {
    console.error(' Error creating users:', error);
    throw error;
  }
}

/**
 * Create mock groups
 */
async function createGroups(users: any[]): Promise<any[]> {
  try {
    const groups: any[] = [];
    
    for (let i = 0; i < mockGroups.length; i++) {
      const groupData = mockGroups[i];
      
      // Assign random users to each group (3-8 members)
      const memberCount = Math.floor(Math.random() * 6) + 3; // 3-8 members
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      const groupMembers = shuffledUsers.slice(0, memberCount);
      
      // First member is creator and admin
      const creator = groupMembers[0];
      const admins = [creator._id];
      
      // Add 1-2 more admins randomly
      if (groupMembers.length > 3) {
        const additionalAdmins = groupMembers.slice(1, 3);
        admins.push(...additionalAdmins.map(user => user._id));
      }
      
      const group = new Group({
        name: groupData.name,
        description: groupData.description,
        members: groupMembers.map(user => user._id),
        admins: admins,
        creator: creator._id
      });
      
      const savedGroup = await group.save();
      groups.push(savedGroup);
    }
    
    console.log(` Created ${groups.length} mock groups`);
    return groups;
  } catch (error) {
    console.error(' Error creating groups:', error);
    throw error;
  }
}

/**
 * Create mock messages
 */
async function createMessages(users: any[], groups: any[]): Promise<any[]> {
  try {
    const messages: any[] = [];
    
    // Create direct messages between users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, users.length); j++) {
        const user1 = users[i];
        const user2 = users[j];
        
        // Create 3-7 messages between each pair
        const messageCount = Math.floor(Math.random() * 5) + 3;
        
        for (let k = 0; k < messageCount; k++) {
          const sender = Math.random() > 0.5 ? user1 : user2;
          const receiver = sender === user1 ? user2 : user1;
          
          const message = new Message({
            content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
            sender: sender._id,
            receiver: receiver._id,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
            readBy: Math.random() > 0.3 ? [receiver._id] : [] // 70% chance message is read
          });
          
          const savedMessage = await message.save();
          messages.push(savedMessage);
        }
      }
    }
    
    // Create group messages
    for (const group of groups) {
      const groupMembers = users.filter(user => 
        group.members.some((memberId: any) => memberId.toString() === user._id.toString())
      );
      
      // Create 5-15 messages per group
      const messageCount = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < messageCount; i++) {
        const sender = groupMembers[Math.floor(Math.random() * groupMembers.length)];
        
        // Random readers (30-80% of group members)
        const readerCount = Math.floor(Math.random() * (groupMembers.length * 0.5)) + Math.floor(groupMembers.length * 0.3);
        const readers = groupMembers
          .filter(member => member._id.toString() !== sender._id.toString())
          .sort(() => 0.5 - Math.random())
          .slice(0, readerCount)
          .map(member => member._id);
        
        const message = new Message({
          content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
          sender: sender._id,
          group: group._id,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          readBy: readers
        });
        
        const savedMessage = await message.save();
        messages.push(savedMessage);
      }
    }
    
    console.log(` Created ${messages.length} mock messages`);
    return messages;
  } catch (error) {
    console.error(' Error creating messages:', error);
    throw error;
  }
}

/**
 * Create mock friend requests
 */
async function createFriendRequests(users: any[]): Promise<any[]> {
  try {
    const friendRequests: any[] = [];
    
    // Create some pending friend requests
    for (let i = 0; i < Math.min(10, users.length * 2); i++) {
      const sender = users[Math.floor(Math.random() * users.length)];
      let recipient = users[Math.floor(Math.random() * users.length)];
      
      // Ensure sender and recipient are different
      while (recipient._id.toString() === sender._id.toString()) {
        recipient = users[Math.floor(Math.random() * users.length)];
      }
      
      // Check if friend request already exists
      const existingRequest = friendRequests.find((req: any) => 
        (req.sender.toString() === sender._id.toString() && req.recipient.toString() === recipient._id.toString()) ||
        (req.sender.toString() === recipient._id.toString() && req.recipient.toString() === sender._id.toString())
      );
      
      if (!existingRequest) {
        const status = Math.random() > 0.7 ? 'pending' : (Math.random() > 0.5 ? 'accepted' : 'rejected');
        
        const friendRequest = new FriendRequest({
          sender: sender._id,
          recipient: recipient._id,
          status: status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random time in last 30 days
        });
        
        const savedRequest = await friendRequest.save();
        friendRequests.push(savedRequest);
      }
    }
    
    console.log(` Created ${friendRequests.length} mock friend requests`);
    return friendRequests;
  } catch (error) {
    console.error(' Error creating friend requests:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function seedDatabase(): Promise<void> {
  try {
    console.log(' Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    await clearData();
    
    // Create mock data
    const users = await createUsers();
    const groups = await createGroups(users);
    const messages = await createMessages(users, groups);
    const friendRequests = await createFriendRequests(users);
    
    console.log('\n Database seeding completed successfully!');
    console.log('\n Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Groups: ${groups.length}`);
    console.log(`   Messages: ${messages.length}`);
    console.log(`   Friend Requests: ${friendRequests.length}`);
    
    console.log('\n Test User Credentials:');
    console.log('   Email: emma.johnson@workplace.com');
    console.log('   Password: Qwerty@123');
    console.log('\n   (All users have the same password: Qwerty@123)');
    
  } catch (error) {
    console.error(' Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n Database connection closed');
    process.exit(0);
  }
}

/**
 * Clear database function
 */
async function clearDatabase(): Promise<void> {
  try {
    console.log(' Clearing database...');
    await connectDB();
    await clearData();
    console.log(' Database cleared successfully!');
  } catch (error) {
    console.error(' Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log(' Database connection closed');
    process.exit(0);
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'clear') {
  clearDatabase();
} else {
  seedDatabase();
}

export {
  seedDatabase,
  clearDatabase,
  mockUsers,
  mockGroups
};
