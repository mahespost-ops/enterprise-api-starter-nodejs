/**
 * MagicLinkToken Model
 * Passwordless authentication tokens
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

export interface MagicLinkTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  codeHash: string;
  fingerprint: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface MagicLinkTokenCreationAttributes
  extends Optional<MagicLinkTokenAttributes, 'id' | 'fingerprint' | 'usedAt' | 'createdAt'> {}

export class MagicLinkToken
  extends Model<MagicLinkTokenAttributes, MagicLinkTokenCreationAttributes>
  implements MagicLinkTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare codeHash: string;
  declare fingerprint: string | null;
  declare expiresAt: Date;
  declare usedAt: Date | null;
  declare readonly createdAt: Date;

  /**
   * Find valid token by hash
   */
  static async findByTokenHash(tokenHash: string): Promise<MagicLinkToken | null> {
    return this.findOne({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  /**
   * Find valid token by code hash
   */
  static async findByCodeHash(codeHash: string): Promise<MagicLinkToken | null> {
    return this.findOne({
      where: {
        codeHash,
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  /**
   * Mark token as used
   */
  async markAsUsed(): Promise<void> {
    this.usedAt = new Date();
    await this.save();
  }
}

MagicLinkToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'user',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'token_hash',
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'code_hash',
    },
    fingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'magic_link_token',
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'], where: { used_at: null }, unique: true },
      { fields: ['expires_at'], where: { used_at: null } },
    ],
  },
);

export default MagicLinkToken;
