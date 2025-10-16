import { Permission, PermissionRequest, PermissionGrant, Logger } from '@free-cluely/shared';
import { ConfigManager } from '@free-cluely/config';

export class PermissionManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private grantedPermissions: Map<string, Map<Permission, PermissionGrant>> = new Map();

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.logger = {
      debug: (msg) => console.debug(`[PermissionManager] ${msg}`),
      info: (msg) => console.info(`[PermissionManager] ${msg}`),
      warn: (msg) => console.warn(`[PermissionManager] ${msg}`),
      error: (msg, err) => console.error(`[PermissionManager] ${msg}`, err)
    };
  }

  public async checkPermission(pluginId: string, method: string): Promise<boolean> {
    try {
      // Get required permission for the method
      const requiredPermission = this.getMethodPermission(method);

      if (!requiredPermission) {
        this.logger.debug(`Method ${method} doesn't require specific permissions`);
        return true;
      }

      // Check if plugin has the required permission
      const hasPermission = this.hasPermission(pluginId, requiredPermission);

      if (!hasPermission && this.configManager.getConfigValue('permissions').autoPrompt) {
        // Auto-prompt for permission if enabled
        return await this.requestPermission(pluginId, requiredPermission, `Required for ${method}`);
      }

      return hasPermission;
    } catch (error) {
      this.logger.error(`Permission check failed for ${pluginId}.${method}`, error as Error);
      return false;
    }
  }

  private getMethodPermission(method: string): Permission | null {
    // Map methods to required permissions
    const methodPermissions: Record<string, Permission> = {
      'captureScreen': 'screen',
      'getClipboard': 'clipboard',
      'setClipboard': 'clipboard',
      'automate': 'automation',
      'networkRequest': 'network',
      'readFile': 'filesystem',
      'writeFile': 'filesystem',
      'analyze': 'screen', // Vision analysis requires screen access
      'chat': 'network', // Chat requires network access for AI APIs
    };

    return methodPermissions[method] || null;
  }

  public hasPermission(pluginId: string, permission: Permission): boolean {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    if (!pluginPermissions) {
      return false;
    }

    const grant = pluginPermissions.get(permission);
    if (!grant) {
      return false;
    }

    // Check if permission is still valid (not expired)
    if (grant.expiresAt && new Date() > grant.expiresAt) {
      // Remove expired permission
      pluginPermissions.delete(permission);
      return false;
    }

    return grant.granted;
  }

  public async requestPermission(
    pluginId: string,
    permission: Permission,
    reason: string
  ): Promise<boolean> {
    try {
      this.logger.info(`Permission request: ${pluginId} -> ${permission}`, { reason });

      // Check if permission is allowed by configuration
      if (!this.configManager.isPermissionAllowed(permission)) {
        this.logger.warn(`Permission ${permission} is not allowed by configuration`);
        return false;
      }

      // For sensitive permissions, we might want to prompt the user
      // For now, we'll auto-grant based on configuration
      const shouldGrant = this.configManager.getConfigValue('permissions').autoPrompt;

      if (shouldGrant) {
        return await this.grantPermission(pluginId, permission, reason);
      }

      return false;
    } catch (error) {
      this.logger.error(`Permission request failed for ${pluginId}`, error as Error);
      return false;
    }
  }

  public async grantPermission(
    pluginId: string,
    permission: Permission,
    reason: string,
    duration?: number // duration in milliseconds
  ): Promise<boolean> {
    try {
      // Initialize plugin permissions map if it doesn't exist
      if (!this.grantedPermissions.has(pluginId)) {
        this.grantedPermissions.set(pluginId, new Map());
      }

      const pluginPermissions = this.grantedPermissions.get(pluginId)!;

      const grant: PermissionGrant = {
        pluginId,
        permission,
        granted: true,
        grantedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration) : undefined,
        conditions: { reason }
      };

      pluginPermissions.set(permission, grant);

      this.logger.info(`Permission granted: ${pluginId} -> ${permission}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to grant permission to ${pluginId}`, error as Error);
      return false;
    }
  }

  public revokePermission(pluginId: string, permission: Permission): boolean {
    try {
      const pluginPermissions = this.grantedPermissions.get(pluginId);
      if (!pluginPermissions) {
        return false;
      }

      const revoked = pluginPermissions.delete(permission);

      if (revoked) {
        this.logger.info(`Permission revoked: ${pluginId} -> ${permission}`);
      }

      return revoked;
    } catch (error) {
      this.logger.error(`Failed to revoke permission from ${pluginId}`, error as Error);
      return false;
    }
  }

  public revokeAllPermissions(pluginId: string): void {
    try {
      this.grantedPermissions.delete(pluginId);
      this.logger.info(`All permissions revoked for plugin: ${pluginId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke all permissions for ${pluginId}`, error as Error);
    }
  }

  public getPluginPermissions(pluginId: string): Permission[] {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    if (!pluginPermissions) {
      return [];
    }

    const permissions: Permission[] = [];
    for (const [permission, grant] of pluginPermissions) {
      if (grant.granted && (!grant.expiresAt || new Date() <= grant.expiresAt)) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  public getAllPermissions(): Map<string, Permission[]> {
    const allPermissions = new Map<string, Permission[]>();

    for (const [pluginId, pluginPermissions] of this.grantedPermissions) {
      const permissions: Permission[] = [];
      for (const [permission, grant] of pluginPermissions) {
        if (grant.granted && (!grant.expiresAt || new Date() <= grant.expiresAt)) {
          permissions.push(permission);
        }
      }
      allPermissions.set(pluginId, permissions);
    }

    return allPermissions;
  }

  public validatePluginPermissions(manifest: any): boolean {
    try {
      if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
        return false;
      }

      // Check if all requested permissions are valid
      const validPermissions: Permission[] = ['screen', 'clipboard', 'automation', 'network', 'filesystem'];

      return manifest.permissions.every((permission: string) =>
        validPermissions.includes(permission as Permission)
      );
    } catch (error) {
      this.logger.error('Plugin permission validation failed', error as Error);
      return false;
    }
  }

  public async validateDomainAccess(pluginId: string, domain: string): Promise<boolean> {
    try {
      // Check if domain is in allowlist
      if (!this.configManager.isDomainAllowed(domain)) {
        this.logger.warn(`Domain access denied: ${domain} not in allowlist`);
        return false;
      }

      // Check if plugin has automation permission
      if (!this.hasPermission(pluginId, 'automation')) {
        this.logger.warn(`Plugin ${pluginId} does not have automation permission`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Domain access validation failed for ${pluginId}`, error as Error);
      return false;
    }
  }

  public cleanupExpiredPermissions(): number {
    let cleanedCount = 0;

    try {
      for (const [pluginId, pluginPermissions] of this.grantedPermissions) {
        for (const [permission, grant] of pluginPermissions) {
          if (grant.expiresAt && new Date() > grant.expiresAt) {
            pluginPermissions.delete(permission);
            cleanedCount++;
          }
        }

        // Remove plugin entry if no permissions left
        if (pluginPermissions.size === 0) {
          this.grantedPermissions.delete(pluginId);
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`Cleaned up ${cleanedCount} expired permissions`);
      }
    } catch (error) {
      this.logger.error('Permission cleanup failed', error as Error);
    }

    return cleanedCount;
  }

  public getPermissionHistory(pluginId: string): PermissionGrant[] {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    if (!pluginPermissions) {
      return [];
    }

    return Array.from(pluginPermissions.values()).filter(grant =>
      !grant.expiresAt || new Date() <= grant.expiresAt
    );
  }

  public exportPermissions(): Record<string, Record<string, PermissionGrant>> {
    const exportData: Record<string, Record<string, PermissionGrant>> = {};

    for (const [pluginId, pluginPermissions] of this.grantedPermissions) {
      exportData[pluginId] = {};
      for (const [permission, grant] of pluginPermissions) {
        if (grant.granted && (!grant.expiresAt || new Date() <= grant.expiresAt)) {
          exportData[pluginId][permission] = grant;
        }
      }
    }

    return exportData;
  }

  public importPermissions(permissionsData: Record<string, Record<string, PermissionGrant>>): void {
    try {
      for (const [pluginId, pluginPermissions] of Object.entries(permissionsData)) {
        if (!this.grantedPermissions.has(pluginId)) {
          this.grantedPermissions.set(pluginId, new Map());
        }

        const pluginPermissionMap = this.grantedPermissions.get(pluginId)!;

        for (const [permission, grant] of Object.entries(pluginPermissions)) {
          pluginPermissionMap.set(permission as Permission, grant);
        }
      }

      this.logger.info('Permissions imported successfully');
    } catch (error) {
      this.logger.error('Permission import failed', error as Error);
      throw error;
    }
  }
}