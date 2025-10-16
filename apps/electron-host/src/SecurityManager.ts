import { Permission, PermissionRequest, PermissionGrant } from '@free-cluely/shared';
import { ConfigManager } from '@free-cluely/config';
import { BrowserWindow, dialog } from 'electron';

export class SecurityManager {
  private configManager: ConfigManager;
  private grantedPermissions: Map<string, Map<Permission, PermissionGrant>> = new Map();
  private permissionQueue: PermissionRequest[] = [];

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async initialize(): Promise<void> {
    console.log('🔒 Security manager initialized');
  }

  public async requestPermission(
    permission: Permission,
    reason: string,
    window?: BrowserWindow
  ): Promise<boolean> {
    try {
      // Check if permission is allowed by configuration
      if (!this.configManager.isPermissionAllowed(permission)) {
        console.warn(`Permission ${permission} is not allowed by configuration`);
        return false;
      }

      // Check if permission is already granted
      const currentPermissions = this.getCurrentPermissions();
      if (currentPermissions.includes(permission)) {
        return true;
      }

      // For auto-prompt enabled, grant immediately
      if (this.configManager.getConfigValue('permissions').autoPrompt) {
        return await this.grantPermission(permission, reason);
      }

      // Otherwise, prompt user
      return await this.promptUserForPermission(permission, reason, window);
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  private async promptUserForPermission(
    permission: Permission,
    reason: string,
    window?: BrowserWindow
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const permissionLabels: Record<Permission, string> = {
        screen: 'Screen Capture',
        clipboard: 'Clipboard Access',
        automation: 'Browser Automation',
        network: 'Network Access',
        filesystem: 'File System Access'
      };

      const permissionDescriptions: Record<Permission, string> = {
        screen: 'Allow Atlas to capture screenshots and analyze screen content',
        clipboard: 'Allow Atlas to read from and write to your clipboard',
        automation: 'Allow Atlas to control your browser and perform automated tasks',
        network: 'Allow Atlas to make network requests',
        filesystem: 'Allow Atlas to read and write files on your computer'
      };

      const result = dialog.showMessageBoxSync(window || BrowserWindow.getFocusedWindow(), {
        type: 'question',
        buttons: ['Allow', 'Deny'],
        defaultId: 0,
        cancelId: 1,
        title: 'Permission Request',
        message: `Atlas requests ${permissionLabels[permission]} permission`,
        detail: `${permissionDescriptions[permission]}\n\nReason: ${reason}\n\nThis permission will be remembered for this session.`
      });

      const granted = result === 0;
      if (granted) {
        this.grantPermission(permission, reason).then(resolve).catch(() => resolve(false));
      } else {
        resolve(false);
      }
    });
  }

  public async grantPermission(
    permission: Permission,
    reason: string,
    duration?: number // duration in milliseconds
  ): Promise<boolean> {
    try {
      // Get the current window or use main window
      const windows = BrowserWindow.getAllWindows();
      const windowId = windows.length > 0 ? windows[0].id.toString() : 'main';

      // Initialize window permissions map if it doesn't exist
      if (!this.grantedPermissions.has(windowId)) {
        this.grantedPermissions.set(windowId, new Map());
      }

      const windowPermissions = this.grantedPermissions.get(windowId)!;

      const grant: PermissionGrant = {
        pluginId: 'system', // System-level permission
        permission,
        granted: true,
        grantedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration) : undefined,
        conditions: { reason, windowId }
      };

      windowPermissions.set(permission, grant);

      console.log(`✅ Permission granted: ${permission}`);
      return true;
    } catch (error) {
      console.error('Failed to grant permission:', error);
      return false;
    }
  }

  public revokePermission(permission: Permission, windowId?: string): boolean {
    try {
      const targetWindowId = windowId || (BrowserWindow.getFocusedWindow()?.id.toString()) || 'main';

      const windowPermissions = this.grantedPermissions.get(targetWindowId);
      if (!windowPermissions) {
        return false;
      }

      const revoked = windowPermissions.delete(permission);

      if (revoked) {
        console.log(`🔒 Permission revoked: ${permission}`);
      }

      return revoked;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return false;
    }
  }

  public getCurrentPermissions(): Permission[] {
    try {
      const window = BrowserWindow.getFocusedWindow();
      const windowId = window?.id.toString() || 'main';

      const windowPermissions = this.grantedPermissions.get(windowId);
      if (!windowPermissions) {
        return [];
      }

      const permissions: Permission[] = [];
      for (const [permission, grant] of windowPermissions) {
        if (grant.granted && (!grant.expiresAt || new Date() <= grant.expiresAt)) {
          permissions.push(permission);
        }
      }

      return permissions;
    } catch (error) {
      console.error('Failed to get current permissions:', error);
      return [];
    }
  }

  public isPermissionGranted(permission: Permission): boolean {
    return this.getCurrentPermissions().includes(permission);
  }

  public async validateDomainAccess(domain: string): Promise<boolean> {
    try {
      // Check if domain is in allowlist
      if (!this.configManager.isDomainAllowed(domain)) {
        console.warn(`Domain access denied: ${domain} not in allowlist`);
        return false;
      }

      // Check if automation permission is granted
      if (!this.isPermissionGranted('automation')) {
        console.warn('Automation permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Domain access validation failed:', error);
      return false;
    }
  }

  public cleanupExpiredPermissions(): number {
    let cleanedCount = 0;

    try {
      for (const [windowId, windowPermissions] of this.grantedPermissions) {
        for (const [permission, grant] of windowPermissions) {
          if (grant.expiresAt && new Date() > grant.expiresAt) {
            windowPermissions.delete(permission);
            cleanedCount++;
          }
        }

        // Remove window entry if no permissions left
        if (windowPermissions.size === 0) {
          this.grantedPermissions.delete(windowId);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired permissions`);
      }
    } catch (error) {
      console.error('Permission cleanup failed:', error);
    }

    return cleanedCount;
  }

  public getAllPermissions(): Map<string, Permission[]> {
    const allPermissions = new Map<string, Permission[]>();

    for (const [windowId, windowPermissions] of this.grantedPermissions) {
      const permissions: Permission[] = [];
      for (const [permission, grant] of windowPermissions) {
        if (grant.granted && (!grant.expiresAt || new Date() <= grant.expiresAt)) {
          permissions.push(permission);
        }
      }
      allPermissions.set(windowId, permissions);
    }

    return allPermissions;
  }

  public async validatePluginPermissions(pluginId: string, permissions: Permission[]): Promise<boolean> {
    try {
      // Check if all requested permissions are valid
      const validPermissions: Permission[] = ['screen', 'clipboard', 'automation', 'network', 'filesystem'];

      for (const permission of permissions) {
        if (!validPermissions.includes(permission)) {
          console.warn(`Invalid permission requested by plugin ${pluginId}: ${permission}`);
          return false;
        }

        // Check if permission is allowed by configuration
        if (!this.configManager.isPermissionAllowed(permission)) {
          console.warn(`Permission ${permission} is not allowed for plugin ${pluginId}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Plugin permission validation failed:', error);
      return false;
    }
  }

  public async requestMultiplePermissions(
    permissions: Permission[],
    reason: string,
    window?: BrowserWindow
  ): Promise<Map<Permission, boolean>> {
    const results = new Map<Permission, boolean>();

    for (const permission of permissions) {
      results.set(permission, await this.requestPermission(permission, reason, window));
    }

    return results;
  }

  public getSecurityStatus(): {
    permissions: Permission[];
    expiredPermissions: number;
    autoPrompt: boolean;
    pluginIsolation: boolean;
  } {
    const currentPermissions = this.getCurrentPermissions();
    const expiredCount = this.cleanupExpiredPermissions();

    return {
      permissions: currentPermissions,
      expiredPermissions: expiredCount,
      autoPrompt: this.configManager.getConfigValue('permissions').autoPrompt,
      pluginIsolation: this.configManager.getConfigValue('security').pluginIsolation
    };
  }

  public async shutdown(): Promise<void> {
    console.log('🔒 Shutting down security manager...');

    // Clean up expired permissions
    this.cleanupExpiredPermissions();

    // Clear all permissions
    this.grantedPermissions.clear();

    console.log('✅ Security manager shutdown complete');
  }
}