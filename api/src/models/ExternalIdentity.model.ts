/**
 * ExternalIdentity Model
 * OAuth/SSO provider integrations
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export type ProviderType = 'google' | 'microsoft' | 'okta' | 'auth0' | 'github' | 'saml';

export interface ExternalIdentityAttributes {
  id: string;
  userId: string;
  provider: ProviderType;
  providerUserId: string;
  providerEmail: string | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  idToken: string | null;
  tokenExpiresAt: Date | null;
  profileData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ExternalIdentityCreationAttributes =
  Optional<
    ExternalIdentityAttributes,
    | 'id'
    | 'providerEmail'
    | 'accessTokenEncrypted'
    | 'refreshTokenEncrypted'
    | 'idToken'
    | 'tokenExpiresAt'
    | 'profileData'
    | 'createdAt'
    | 'updatedAt'
  >;

export class ExternalIdentity
  extends Model<ExternalIdentityAttributes, ExternalIdentityCreationAttributes>
  implements ExternalIdentityAttributes
{
  declare id: string;
  declare userId: string;
  declare provider: ProviderType;
  declare providerUserId: string;
  declare providerEmail: string | null;
  declare accessTokenEncrypted: string | null;
  declare refreshTokenEncrypted: string | null;
  declare idToken: string | null;
  declare tokenExpiresAt: Date | null;
  declare profileData: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ExternalIdentity.init(
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
    provider: {
      type: DataTypes.ENUM('google', 'microsoft', 'okta', 'auth0', 'github', 'saml'),
      allowNull: false,
    },
    providerUserId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_user_id',
    },
    providerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_email',
    },
    accessTokenEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_token_encrypted',
    },
    refreshTokenEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token_encrypted',
    },
    idToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'id_token',
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'token_expires_at',
    },
    profileData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'profile_data',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'external_identity',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['provider', 'provider_user_id'], unique: true },
    ],
  },
);

export default ExternalIdentity;
