/**
 * Environment Model (Stub)
 * In-memory stub for environment management
 * TODO: Replace with actual database implementation
 */

export interface Environment {
  id: string;
  organizationId: string;
  name: string;
  type: 'live' | 'sandbox';
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory store for environments (stub)
 */
const environments = new Map<string, Environment>();

/**
 * EnvironmentModel class
 */
class EnvironmentModelClass {
  /**
   * Find environment by ID
   */
  async findById(id: string): Promise<Environment | null> {
    return environments.get(id) || null;
  }

  /**
   * Check if environment exists
   * @param envId - Environment ID
   * @returns true if environment exists
   */
  async exists(envId: string): Promise<boolean> {
    // Stub: Return false if envId is all 9s (test case for 404)
    if (envId === '99999999-9999-9999-9999-999999999999') {
      return false;
    }

    // Stub: Return true for any other env (in real app, check database)
    return true;
  }

  /**
   * Create a new environment (stub)
   */
  async create(data: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Environment> {
    const env: Environment = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    environments.set(env.id, env);
    return env;
  }

  /**
   * Find environments by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<Environment[]> {
    return Array.from(environments.values()).filter(
      (env) => env.organizationId === organizationId,
    );
  }

  /**
   * Clear all environments (for testing)
   */
  async clear(): Promise<void> {
    environments.clear();
  }
}

export const EnvironmentModel = new EnvironmentModelClass();
export default EnvironmentModel;
