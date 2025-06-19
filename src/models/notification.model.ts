import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'friend_request' | 'friend_accepted' | 'friend_rejected' | 'message' | 'group_invite' | 'system';
  title: string;
  message: string;
  data?: {
    friendRequestId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    messageId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['friend_request', 'friend_accepted', 'friend_rejected', 'message', 'group_invite', 'system'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// Virtual populate for sender details
NotificationSchema.virtual('senderDetails', {
  ref: 'User',
  localField: 'sender',
  foreignField: '_id',
  justOne: true,
  select: 'firstName lastName email profilePicture'
});

// Static method to create friend request notification
NotificationSchema.statics.createFriendRequestNotification = async function(
  senderId: mongoose.Types.ObjectId, 
  recipientId: mongoose.Types.ObjectId, 
  friendRequestId: mongoose.Types.ObjectId
) {
  const senderUser = await mongoose.model('User').findById(senderId).select('firstName lastName');
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${senderUser?.firstName} ${senderUser?.lastName} sent you a friend request`,
    data: {
      friendRequestId
    }
  });
};

// Static method to create friend accepted notification
NotificationSchema.statics.createFriendAcceptedNotification = async function(
  senderId: mongoose.Types.ObjectId, 
  recipientId: mongoose.Types.ObjectId
) {
  const senderUser = await mongoose.model('User').findById(senderId).select('firstName lastName');
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: `${senderUser?.firstName} ${senderUser?.lastName} accepted your friend request`,
    data: {}
  });
};

// Static method to create friend rejected notification
NotificationSchema.statics.createFriendRejectedNotification = async function(
  senderId: mongoose.Types.ObjectId, 
  recipientId: mongoose.Types.ObjectId
) {
  const senderUser = await mongoose.model('User').findById(senderId).select('firstName lastName');
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'friend_rejected',
    title: 'Friend Request Declined',
    message: `${senderUser?.firstName} ${senderUser?.lastName} declined your friend request`,
    data: {}
  });
};

// Instance method to mark as read
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

export default mongoose.model<INotification>('Notification', NotificationSchema);
