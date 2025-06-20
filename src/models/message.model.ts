import mongoose, { Document, ObjectId, Schema } from 'mongoose';
import { IUser } from './user.model';
import { IGroup } from './group.model';

export interface IMessage extends Document<ObjectId> {
  content: string;
  sender: mongoose.Types.ObjectId | IUser;
  receiver?: mongoose.Types.ObjectId | IUser; // For direct messages
  group?: mongoose.Types.ObjectId | IGroup; // For group messages
  readBy: mongoose.Types.ObjectId[] | IUser[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: true,
      trim: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group'
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

// Validation to ensure either receiver or group is provided
MessageSchema.pre('save', function(next) {
  if (!this.receiver && !this.group) {
    const error = new Error('A message must have either a receiver or a group');
    return next(error);
  }
  
  if (this.receiver && this.group) {
    const error = new Error('A message cannot have both a receiver and a group');
    return next(error);
  }
  
  next();
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;