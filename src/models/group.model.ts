import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';

export interface IGroup extends Document {
  name: string;
  description?: string;
  creator: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

// Add creator as a member and admin when creating a group
GroupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add creator to members and admins arrays if not already there
    if (!this.members.includes(this.creator)) {
      this.members.push(this.creator);
    }
    
    if (!this.admins.includes(this.creator)) {
      this.admins.push(this.creator);
    }
  }
  next();
});

const Group = mongoose.model<IGroup>('Group', GroupSchema);

export default Group;