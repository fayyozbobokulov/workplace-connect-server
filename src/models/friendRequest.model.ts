import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendRequest extends Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
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
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
FriendRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
FriendRequestSchema.index({ sender: 1, status: 1, createdAt: -1 });

// Virtual populate for sender details
FriendRequestSchema.virtual('senderDetails', {
  ref: 'User',
  localField: 'sender',
  foreignField: '_id',
  justOne: true,
  select: 'firstName lastName email profilePicture'
});

// Virtual populate for recipient details
FriendRequestSchema.virtual('recipientDetails', {
  ref: 'User',
  localField: 'recipient',
  foreignField: '_id',
  justOne: true,
  select: 'firstName lastName email profilePicture'
});

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
