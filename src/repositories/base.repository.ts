import { Model, Document, FilterQuery, UpdateQuery, QueryOptions, PipelineStage, ClientSession, Types } from 'mongoose';

/**
 * Base Repository Interface
 * Defines standard operations to be implemented by all repositories
 */
export interface IBaseRepository<T extends Document> {
  // Basic CRUD operations
  findById(id: string | Types.ObjectId): Promise<T | null>;
  findOne(filter: FilterQuery<T>, projection?: any, options?: QueryOptions<T>): Promise<T | null>;
  find(filter: FilterQuery<T>, projection?: any, options?: QueryOptions<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  updateById(id: string | Types.ObjectId, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<T | null>;
  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<T | null>;
  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<number>;
  deleteById(id: string | Types.ObjectId): Promise<boolean>;
  deleteOne(filter: FilterQuery<T>): Promise<boolean>;
  deleteMany(filter: FilterQuery<T>): Promise<number>;
  
  // Advanced operations
  count(filter: FilterQuery<T>): Promise<number>;
  aggregate(pipeline: PipelineStage[]): Promise<any[]>;
  
  // Transaction support
  startSession(): Promise<ClientSession>;
  withTransaction<U>(callback: (session: ClientSession) => Promise<U>): Promise<U>;
}

/**
 * Base Repository Implementation
 * Implements standard database operations that can be extended by specific repositories
 */
export class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected model: Model<T>;
  
  /**
   * Creates a new repository instance
   * @param model - Mongoose model
   */
  constructor(model: Model<T>) {
    this.model = model;
  }
  
  /**
   * Find document by ID
   * @param id - Document ID
   * @returns Promise resolving to document or null if not found
   */
  async findById(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findById(id).exec();
  }
  
  /**
   * Find a single document matching the filter
   * @param filter - Filter criteria
   * @param projection - Fields to include/exclude
   * @param options - Query options
   * @returns Promise resolving to document or null if not found
   */
  async findOne(filter: FilterQuery<T>, projection?: any, options?: QueryOptions<T>): Promise<T | null> {
    return this.model.findOne(filter, projection, options).exec();
  }
  
  /**
   * Find documents matching the filter
   * @param filter - Filter criteria
   * @param projection - Fields to include/exclude
   * @param options - Query options
   * @returns Promise resolving to array of documents
   */
  async find(filter: FilterQuery<T>, projection?: any, options?: QueryOptions<T>): Promise<T[]> {
    return this.model.find(filter, projection, options).exec();
  }
  
  /**
   * Create a new document
   * @param data - Document data
   * @returns Promise resolving to created document
   */
  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }
  
  /**
   * Update document by ID
   * @param id - Document ID
   * @param update - Update data
   * @param options - Query options
   * @returns Promise resolving to updated document or null if not found
   */
  async updateById(id: string | Types.ObjectId, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true, ...options }).exec();
  }
  
  /**
   * Update a single document matching the filter
   * @param filter - Filter criteria
   * @param update - Update data
   * @param options - Query options
   * @returns Promise resolving to updated document or null if not found
   */
  async updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true, ...options }).exec();
  }
  
  /**
   * Update multiple documents matching the filter
   * @param filter - Filter criteria
   * @param update - Update data
   * @param options - Query options
   * @returns Promise resolving to number of documents updated
   */
  async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions<T>): Promise<number> {
    const result = await this.model.updateMany(filter, update, options as any).exec();
    return result.modifiedCount;
  }
  
  /**
   * Delete document by ID
   * @param id - Document ID
   * @returns Promise resolving to boolean indicating success
   */
  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }
  
  /**
   * Delete a single document matching the filter
   * @param filter - Filter criteria
   * @returns Promise resolving to boolean indicating success
   */
  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }
  
  /**
   * Delete multiple documents matching the filter
   * @param filter - Filter criteria
   * @returns Promise resolving to number of documents deleted
   */
  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }
  
  /**
   * Count documents matching the filter
   * @param filter - Filter criteria
   * @returns Promise resolving to count
   */
  async count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
  
  /**
   * Execute an aggregation pipeline
   * @param pipeline - Aggregation pipeline stages
   * @returns Promise resolving to aggregation results
   */
  async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
  
  /**
   * Start a new MongoDB session
   * @returns Promise resolving to session
   */
  async startSession(): Promise<ClientSession> {
    return this.model.db.startSession();
  }
  
  /**
   * Execute operations within a transaction
   * @param callback - Function to execute within transaction
   * @returns Promise resolving to result of callback
   */
  async withTransaction<U>(callback: (session: ClientSession) => Promise<U>): Promise<U> {
    const session = await this.startSession();
    
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
