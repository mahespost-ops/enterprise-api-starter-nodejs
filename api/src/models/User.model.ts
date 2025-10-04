/**
 * User Model (Stub)
 *
 * This is a temporary in-memory implementation for TDD purposes.
 * Will be replaced with actual Sequelize/Prisma model when database layer is implemented.
 */

import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  preferredAuthMethod: 'email' | 'sms';
  timezone?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Temporary in-memory storage
const users: Map<string, User> = new Map();

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: Omit<User, 'id' | 'createdAt' | 'fullName'>): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
      createdAt: new Date().toISOString(),
    };

    users.set(id, user);
    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    return users.get(id) || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return Array.from(users.values()).find(u => u.email === email) || null;
  }

  /**
   * Find user by phone number (E.164 format)
   */
  static async findByPhone(phone: string): Promise<User | null> {
    return Array.from(users.values()).find(u => u.phone === phone) || null;
  }

  /**
   * Find user by identifier (polymorphic: email or phone)
   */
  static async findByIdentifier(identifier: string): Promise<User | null> {
    // Try email first (most common case)
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;

    // Try phone (E.164 format starts with +)
    if (identifier.startsWith('+')) {
      return await this.findByPhone(identifier);
    }

    return null;
  }

  /**
   * Update user
   */
  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    users.set(id, updated);
    return updated;
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    return users.delete(id);
  }

  /**
   * Clear all users (for testing)
   */
  static async clear(): Promise<void> {
    users.clear();
  }
}
