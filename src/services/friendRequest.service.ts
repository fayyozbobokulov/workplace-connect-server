import mongoose, { ObjectId } from 'mongoose';
import FriendRequest, { IFriendRequest } from '../models/friendRequest.model';
import User from '../models/user.model';
import { NotificationRepository } from '../repositories/notification.repository';

export class FriendRequestService {
  private notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(senderId: mongoose.Types.ObjectId, recipientId: mongoose.Types.ObjectId): Promise<IFriendRequest> {
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    });

    if (existingRequest) {
      throw new Error('Friend request already exists');
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      sender: senderId,
      recipient: recipientId,
      status: 'pending'
    });

    // Create notification for recipient
    await this.notificationRepository.createFriendRequestNotification(
      senderId,
      recipientId,
      friendRequest._id
    );

    return friendRequest;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(friendRequestId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<IFriendRequest> {
    const friendRequest = await FriendRequest.findOne({
      _id: friendRequestId,
      recipient: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      throw new Error('Friend request not found or already processed');
    }

    // Update friend request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Create notification for sender
    await this.notificationRepository.createFriendAcceptedNotification(
      userId,
      friendRequest.sender
    );

    // Delete the original friend request notification
    await this.notificationRepository.deleteFriendRequestNotifications(friendRequestId);

    return friendRequest;
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(friendRequestId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<IFriendRequest> {
    const friendRequest = await FriendRequest.findOne({
      _id: friendRequestId,
      recipient: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      throw new Error('Friend request not found or already processed');
    }

    // Update friend request status
    friendRequest.status = 'rejected';
    await friendRequest.save();

    // Create notification for sender
    await this.notificationRepository.createFriendRejectedNotification(
      userId,
      friendRequest.sender
    );

    // Delete the original friend request notification
    await this.notificationRepository.deleteFriendRequestNotifications(friendRequestId);

    return friendRequest;
  }

  /**
   * Cancel a friend request (by sender)
   */
  async cancelFriendRequest(friendRequestId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean> {
    const friendRequest = await FriendRequest.findOne({
      _id: friendRequestId,
      sender: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      throw new Error('Friend request not found or cannot be cancelled');
    }

    // Delete the friend request
    await FriendRequest.deleteOne({ _id: friendRequestId });

    // Delete the associated notification
    await this.notificationRepository.deleteFriendRequestNotifications(friendRequestId);

    return true;
  }

  /**
   * Get friend requests for a user
   */
  async getFriendRequests(
    userId: mongoose.Types.ObjectId, 
    type: 'sent' | 'received' = 'received',
    status: 'pending' | 'accepted' | 'rejected' = 'pending'
  ): Promise<IFriendRequest[]> {
    const filter: any = { status };

    if (type === 'sent') {
      filter.sender = userId;
    } else {
      filter.recipient = userId;
    }

    return await FriendRequest.find(filter)
      .populate('senderDetails')
      .populate('recipientDetails')
      .sort({ createdAt: -1 });
  }

  /**
   * Get friend request by ID
   */
  async getFriendRequestById(friendRequestId: mongoose.Types.ObjectId): Promise<IFriendRequest | null> {
    return await FriendRequest.findById(friendRequestId)
      .populate('senderDetails')
      .populate('recipientDetails');
  }
}
