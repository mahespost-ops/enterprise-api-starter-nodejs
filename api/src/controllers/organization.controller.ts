/**
 * Organization Controller
 * Handles HTTP request/response for organization-related operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import organizationService from '../services/organization.service';
import logger from '../config/logger';

/**
 * @desc    Get organization details
 * @route   GET /api/v1/orgs/:orgId
 * @access  Private (member access)
 */
export const getOrganization = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Getting organization: ${orgId}`);

  const organization = await organizationService.getOrganization(orgId, userId);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    defaultEnvId: organization.defaultEnvId,
    logoUrl: organization.logoUrl,
    website: organization.website,
    primaryContactName: organization.primaryContactName,
    primaryContactEmail: organization.primaryContactEmail,
    primaryContactPhone: organization.primaryContactPhone,
    addressLine1: organization.addressLine1,
    addressLine2: organization.addressLine2,
    city: organization.city,
    stateProvince: organization.stateProvince,
    postalCode: organization.postalCode,
    country: organization.country,
    metadata: organization.metadata,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  });
});

/**
 * @desc    Update organization details
 * @route   PATCH /api/v1/orgs/:orgId
 * @access  Private (requires organizations:manage permission)
 */
export const updateOrganization = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Updating organization: ${orgId}`);

  const organization = await organizationService.updateOrganization(orgId, userId, req.body);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    defaultEnvId: organization.defaultEnvId,
    logoUrl: organization.logoUrl,
    website: organization.website,
    primaryContactName: organization.primaryContactName,
    primaryContactEmail: organization.primaryContactEmail,
    primaryContactPhone: organization.primaryContactPhone,
    addressLine1: organization.addressLine1,
    addressLine2: organization.addressLine2,
    city: organization.city,
    stateProvince: organization.stateProvince,
    postalCode: organization.postalCode,
    country: organization.country,
    metadata: organization.metadata,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  });
});
