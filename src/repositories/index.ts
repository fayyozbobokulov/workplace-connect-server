import { IUserRepository, UserRepository } from './user.repository';
import { IGroupRepository, GroupRepository } from './group.repository';
import { IMessageRepository, MessageRepository } from './message.repository';

/**
 * Repository Factory
 * Provides access to all repositories with singleton instances
 */
class RepositoryFactory {
  private static userRepository: IUserRepository;
  private static groupRepository: IGroupRepository;
  private static messageRepository: IMessageRepository;

  /**
   * Get the User repository instance
   * @returns User repository
   */
  static getUserRepository(): IUserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  /**
   * Get the Group repository instance
   * @returns Group repository
   */
  static getGroupRepository(): IGroupRepository {
    if (!this.groupRepository) {
      this.groupRepository = new GroupRepository();
    }
    return this.groupRepository;
  }

  /**
   * Get the Message repository instance
   * @returns Message repository
   */
  static getMessageRepository(): IMessageRepository {
    if (!this.messageRepository) {
      this.messageRepository = new MessageRepository();
    }
    return this.messageRepository;
  }
}

export default RepositoryFactory;
export { IUserRepository, IGroupRepository, IMessageRepository };
export { BaseRepository, IBaseRepository } from './base.repository';
