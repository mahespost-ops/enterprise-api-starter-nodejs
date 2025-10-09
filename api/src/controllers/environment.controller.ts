/**
 * Environment Controller
 * Handles HTTP request/response for environment-related operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import environmentService from '../services/environment.service';
import logger from '../config/logger';
import { EnvironmentType } from '../models/Environment.model';

/**
 * @desc    List environments for an organization
 * @route   GET /api/v1/orgs/:orgId/envs
 * @access  Private (member access)
 */
export const listEnvironments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const userId = req.user!.sub;
  const { limit, offset, search, fields } = req.query;

  logger.debug(`Listing environments for organization: ${orgId}`);

  // Extract filters from query params
  const type = req.query['filter[type]'] as EnvironmentType | undefined;
  const isDefaultStr = req.query['filter[isDefault]'] as string | undefined;
  const isDefault = isDefaultStr === 'true' ? true : isDefaultStr === 'false' ? false : undefined;

  const result = await environmentService.listEnvironments(orgId, userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    type,
    isDefault,
    search: search as string | undefined,
    fields: fields ? (fields as string).split(',') : undefined,
  });

  // Transform environments to camelCase
  const data = result.data.map((env) => ({
    id: env.id,
    organizationId: env.organizationId,
    name: env.name,
    type: env.type,
    description: env.description,
    isDefault: env.isDefault,
    metadata: env.metadata,
    isActive: env.isActive,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
  }));

  res.status(HTTP_STATUS.OK).json({
    data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Create new environment
 * @route   POST /api/v1/orgs/:orgId/envs
 * @access  Private (requires environments:manage permission)
 */
export const createEnvironment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Creating environment for organization: ${orgId}`);

  const environment = await environmentService.createEnvironment(orgId, userId, req.body);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.CREATED).json({
    id: environment.id,
    organizationId: environment.organizationId,
    name: environment.name,
    type: environment.type,
    description: environment.description,
    isDefault: environment.isDefault,
    metadata: environment.metadata,
    isActive: environment.isActive,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
  });
});

/**
 * @desc    Get environment details
 * @route   GET /api/v1/orgs/:orgId/envs/:envId
 * @access  Private (member access)
 */
export const getEnvironment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Getting environment: ${envId}`);

  const environment = await environmentService.getEnvironment(orgId, envId, userId);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: environment.id,
    organizationId: environment.organizationId,
    name: environment.name,
    type: environment.type,
    description: environment.description,
    isDefault: environment.isDefault,
    metadata: environment.metadata,
    isActive: environment.isActive,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
  });
});

/**
 * @desc    Update environment
 * @route   PUT /api/v1/orgs/:orgId/envs/:envId
 * @access  Private (requires environments:manage permission)
 */
export const updateEnvironment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Updating environment: ${envId}`);

  const environment = await environmentService.updateEnvironment(orgId, envId, userId, req.body);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: environment.id,
    organizationId: environment.organizationId,
    name: environment.name,
    type: environment.type,
    description: environment.description,
    isDefault: environment.isDefault,
    metadata: environment.metadata,
    isActive: environment.isActive,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
  });
});

/**
 * @desc    Delete environment (soft delete)
 * @route   DELETE /api/v1/orgs/:orgId/envs/:envId
 * @access  Private (requires environments:manage permission)
 */
export const deleteEnvironment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Deleting environment: ${envId}`);

  await environmentService.deleteEnvironment(orgId, envId, userId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
