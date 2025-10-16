import { PluginManifest, Logger } from '@free-cluely/shared';

export class PluginRegistry {
  private logger: Logger;
  private registry: Map<string, PluginManifest> = new Map();
  private capabilitiesIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.logger = {
      debug: (msg) => console.debug(`[PluginRegistry] ${msg}`),
      info: (msg) => console.info(`[PluginRegistry] ${msg}`),
      warn: (msg) => console.warn(`[PluginRegistry] ${msg}`),
      error: (msg, err) => console.error(`[PluginRegistry] ${msg}`, err)
    };
  }

  public register(manifest: PluginManifest): void {
    try {
      this.logger.debug(`Registering plugin: ${manifest.id}`);

      if (this.registry.has(manifest.id)) {
        throw new Error(`Plugin ${manifest.id} is already registered`);
      }

      this.registry.set(manifest.id, manifest);

      // Update capabilities index
      this.updateCapabilitiesIndex(manifest);

      this.logger.info(`Plugin registered: ${manifest.id} v${manifest.version}`);
    } catch (error) {
      this.logger.error(`Failed to register plugin ${manifest.id}`, error as Error);
      throw error;
    }
  }

  public unregister(pluginId: string): void {
    try {
      this.logger.debug(`Unregistering plugin: ${pluginId}`);

      const manifest = this.registry.get(pluginId);
      if (!manifest) {
        throw new Error(`Plugin ${pluginId} is not registered`);
      }

      this.registry.delete(pluginId);

      // Remove from capabilities index
      this.removeFromCapabilitiesIndex(manifest);

      this.logger.info(`Plugin unregistered: ${pluginId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister plugin ${pluginId}`, error as Error);
      throw error;
    }
  }

  public getManifest(pluginId: string): PluginManifest | null {
    return this.registry.get(pluginId) || null;
  }

  public getAllManifests(): PluginManifest[] {
    return Array.from(this.registry.values());
  }

  public isRegistered(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  public findPluginsByCapability(capability: string): PluginManifest[] {
    const pluginIds = this.capabilitiesIndex.get(capability) || new Set();
    return Array.from(pluginIds)
      .map(id => this.registry.get(id))
      .filter(manifest => manifest !== undefined) as PluginManifest[];
  }

  public findPluginsByPermission(permission: string): PluginManifest[] {
    return this.getAllManifests().filter(manifest =>
      manifest.permissions.includes(permission as any)
    );
  }

  public isValidManifest(manifest: any): boolean {
    try {
      // Basic validation
      if (!manifest || typeof manifest !== 'object') {
        return false;
      }

      // Required fields
      const required = ['id', 'name', 'version', 'description', 'author', 'permissions', 'capabilities', 'entryPoint'];
      for (const field of required) {
        if (!(field in manifest)) {
          this.logger.debug(`Missing required field: ${field}`);
          return false;
        }
      }

      // Validate field types
      if (typeof manifest.id !== 'string' || manifest.id.length === 0) {
        return false;
      }

      if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
        return false;
      }

      if (typeof manifest.version !== 'string' || !this.isValidVersion(manifest.version)) {
        return false;
      }

      if (typeof manifest.description !== 'string' || manifest.description.length === 0) {
        return false;
      }

      if (typeof manifest.author !== 'string' || manifest.author.length === 0) {
        return false;
      }

      if (!Array.isArray(manifest.permissions)) {
        return false;
      }

      if (!Array.isArray(manifest.capabilities)) {
        return false;
      }

      if (typeof manifest.entryPoint !== 'string' || manifest.entryPoint.length === 0) {
        return false;
      }

      // Validate permissions
      const validPermissions = ['screen', 'clipboard', 'automation', 'network', 'filesystem'];
      for (const permission of manifest.permissions) {
        if (!validPermissions.includes(permission)) {
          this.logger.debug(`Invalid permission: ${permission}`);
          return false;
        }
      }

      // Validate capabilities (should be non-empty strings)
      for (const capability of manifest.capabilities) {
        if (typeof capability !== 'string' || capability.length === 0) {
          this.logger.debug(`Invalid capability: ${capability}`);
          return false;
        }
      }

      // Validate dependencies if present
      if (manifest.dependencies) {
        if (typeof manifest.dependencies !== 'object') {
          return false;
        }

        for (const [depName, depVersion] of Object.entries(manifest.dependencies)) {
          if (typeof depName !== 'string' || typeof depVersion !== 'string') {
            return false;
          }
          if (!this.isValidVersion(depVersion)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Manifest validation error', error as Error);
      return false;
    }
  }

  private isValidVersion(version: string): boolean {
    // Simple semantic version validation (e.g., "1.0.0", "2.1.3")
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  private updateCapabilitiesIndex(manifest: PluginManifest): void {
    for (const capability of manifest.capabilities) {
      if (!this.capabilitiesIndex.has(capability)) {
        this.capabilitiesIndex.set(capability, new Set());
      }
      this.capabilitiesIndex.get(capability)!.add(manifest.id);
    }
  }

  private removeFromCapabilitiesIndex(manifest: PluginManifest): void {
    for (const capability of manifest.capabilities) {
      const pluginSet = this.capabilitiesIndex.get(capability);
      if (pluginSet) {
        pluginSet.delete(manifest.id);
        if (pluginSet.size === 0) {
          this.capabilitiesIndex.delete(capability);
        }
      }
    }
  }

  public getCapabilities(): string[] {
    return Array.from(this.capabilitiesIndex.keys());
  }

  public getPluginsForCapabilities(capabilities: string[]): Map<string, string[]> {
    const result = new Map<string, string[]>();

    for (const capability of capabilities) {
      const pluginIds = this.capabilitiesIndex.get(capability);
      if (pluginIds) {
        result.set(capability, Array.from(pluginIds));
      }
    }

    return result;
  }

  public getPluginCount(): number {
    return this.registry.size;
  }

  public getCapabilityCount(): number {
    return this.capabilitiesIndex.size;
  }

  public getRegistryStats(): {
    totalPlugins: number;
    totalCapabilities: number;
    pluginsByCapability: Record<string, number>;
  } {
    const pluginsByCapability: Record<string, number> = {};

    for (const [capability, pluginSet] of this.capabilitiesIndex) {
      pluginsByCapability[capability] = pluginSet.size;
    }

    return {
      totalPlugins: this.getPluginCount(),
      totalCapabilities: this.getCapabilityCount(),
      pluginsByCapability
    };
  }

  public clear(): void {
    this.registry.clear();
    this.capabilitiesIndex.clear();
    this.logger.info('Plugin registry cleared');
  }

  public exportRegistry(): Record<string, PluginManifest> {
    const exportData: Record<string, PluginManifest> = {};

    for (const [pluginId, manifest] of this.registry) {
      // Create a copy without sensitive data
      exportData[pluginId] = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        permissions: manifest.permissions,
        capabilities: manifest.capabilities,
        entryPoint: manifest.entryPoint,
        dependencies: manifest.dependencies
      };
    }

    return exportData;
  }

  public importRegistry(registryData: Record<string, PluginManifest>): void {
    try {
      this.clear();

      for (const manifest of Object.values(registryData)) {
        if (this.isValidManifest(manifest)) {
          this.register(manifest);
        } else {
          this.logger.warn(`Skipping invalid manifest during import: ${manifest.id}`);
        }
      }

      this.logger.info(`Registry imported with ${this.getPluginCount()} plugins`);
    } catch (error) {
      this.logger.error('Registry import failed', error as Error);
      throw error;
    }
  }
}