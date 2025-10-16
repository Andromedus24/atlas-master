import {
  Plugin,
  PluginMessage,
  PluginResponse,
  PluginContext,
  ID,
  Permission,
  Logger,
  EventEmitter
} from '@free-cluely/shared';
import { EventEmitter as NodeEventEmitter } from 'events';
import * as path from 'path';
import * as vm from 'vm';

export interface PluginLoadOptions {
  trusted?: boolean;
  sandbox?: vm.Context;
  timeout?: number;
}

export class PluginBus extends NodeEventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  private logger: Logger;
  private pluginTimeout: number = 30000; // 30 seconds

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async loadPlugin(pluginPath: string, options: PluginLoadOptions = {}): Promise<void> {
    const pluginId = path.basename(pluginPath, path.extname(pluginPath));

    try {
      // Check if plugin is already loaded
      if (this.plugins.has(pluginId)) {
        throw new Error(`Plugin ${pluginId} is already loaded`);
      }

      // Load plugin manifest
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestContent = require(manifestPath);

      // Validate manifest
      const { PluginManifestSchema } = await import('@free-cluely/shared');
      const manifest = PluginManifestSchema.parse(manifestContent);

      // Check permissions
      if (!options.trusted && !this.validatePluginPath(pluginPath)) {
        throw new Error(`Plugin ${pluginId} is not from a trusted path`);
      }

      // Create sandbox context if needed
      let sandbox: vm.Context | undefined;
      if (!options.trusted) {
        sandbox = vm.createContext({
          require: this.createSecureRequire(pluginPath),
          console: this.createSecureConsole(),
          setTimeout,
          setInterval,
          clearTimeout,
          clearInterval,
          Buffer,
          process: { env: {} }, // Limited process object
        });
      }

      // Load plugin code
      const pluginCode = require(path.join(pluginPath, 'index.js'));
      const PluginClass = pluginCode.default || pluginCode;

      if (!PluginClass || typeof PluginClass !== 'function') {
        throw new Error(`Plugin ${pluginId} does not export a valid class`);
      }

      // Create plugin context
      const context: PluginContext = {
        config: {}, // Will be populated by config manager
        permissions: new Set(manifest.permissions),
        sendMessage: async (message: PluginMessage) => this.sendMessage(message),
        logger: this.createPluginLogger(pluginId)
      };

      // Instantiate plugin
      const plugin = new PluginClass();

      if (typeof plugin.initialize !== 'function' || typeof plugin.handleMessage !== 'function') {
        throw new Error(`Plugin ${pluginId} does not implement required methods`);
      }

      // Initialize plugin with timeout
      await this.executeWithTimeout(
        () => plugin.initialize(context),
        options.timeout || this.pluginTimeout,
        `Plugin ${pluginId} initialization timed out`
      );

      // Store plugin and context
      this.plugins.set(pluginId, plugin);
      this.contexts.set(pluginId, context);

      this.logger.info(`Loaded plugin: ${pluginId}`, { version: manifest.version });
      this.emit('plugin-loaded', { pluginId, manifest });

    } catch (error) {
      this.logger.error(`Failed to load plugin ${pluginId}`, error as Error);
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    try {
      // Call plugin destroy method with timeout
      await this.executeWithTimeout(
        () => plugin.destroy(),
        this.pluginTimeout,
        `Plugin ${pluginId} destruction timed out`
      );

      // Clean up
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);

      this.logger.info(`Unloaded plugin: ${pluginId}`);
      this.emit('plugin-unloaded', { pluginId });

    } catch (error) {
      this.logger.error(`Failed to unload plugin ${pluginId}`, error as Error);
      // Force cleanup even if destroy fails
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);
    }
  }

  async sendMessage(message: PluginMessage): Promise<PluginResponse> {
    const { plugin: targetPlugin, method, payload, id } = message;

    // Validate target plugin exists
    const plugin = this.plugins.get(targetPlugin);
    if (!plugin) {
      throw new Error(`Plugin ${targetPlugin} is not loaded`);
    }

    // Check if plugin has permission for this operation
    const context = this.contexts.get(targetPlugin);
    if (!context) {
      throw new Error(`No context found for plugin ${targetPlugin}`);
    }

    // Validate permissions based on method
    if (!this.validatePermission(context, method, payload)) {
      throw new Error(`Plugin ${targetPlugin} does not have permission for method ${method}`);
    }

    try {
      // Execute plugin method with timeout
      const result = await this.executeWithTimeout(
        () => plugin.handleMessage(message),
        this.pluginTimeout,
        `Plugin ${targetPlugin} method ${method} timed out`
      );

      this.logger.debug(`Plugin ${targetPlugin} executed ${method}`, { messageId: id });
      this.emit('message-handled', { pluginId: targetPlugin, message, result });

      return result;

    } catch (error) {
      this.logger.error(`Plugin ${targetPlugin} failed to handle message`, error as Error, {
        method,
        messageId: id
      });

      this.emit('plugin-error', {
        pluginId: targetPlugin,
        error: error as Error,
        message
      });

      return {
        id,
        success: false,
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  isPluginLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  private validatePluginPath(pluginPath: string): boolean {
    // Check against trusted paths from config
    // This would be implemented with the actual config manager
    const trustedPaths = process.env.ATLAS_TRUSTED_PATHS?.split(',') || [];
    return trustedPaths.some(trustedPath =>
      pluginPath.startsWith(path.resolve(trustedPath))
    );
  }

  private createSecureRequire(pluginPath: string) {
    return (modulePath: string) => {
      // Only allow requiring modules from the plugin's own directory
      if (modulePath.startsWith('.')) {
        const fullPath = path.resolve(pluginPath, modulePath);
        if (fullPath.startsWith(pluginPath)) {
          return require(fullPath);
        }
      }
      throw new Error(`Cannot require module: ${modulePath}`);
    };
  }

  private createSecureConsole() {
    return {
      log: (...args: any[]) => this.logger.info(args.join(' ')),
      warn: (...args: any[]) => this.logger.warn(args.join(' ')),
      error: (...args: any[]) => this.logger.error(args.join(' ')),
      debug: (...args: any[]) => this.logger.debug(args.join(' '))
    };
  }

  private createPluginLogger(pluginId: string): Logger {
    return {
      info: (message: string, meta?: Record<string, any>) =>
        this.logger.info(`[${pluginId}] ${message}`, meta),
      warn: (message: string, meta?: Record<string, any>) =>
        this.logger.warn(`[${pluginId}] ${message}`, meta),
      error: (message: string, error?: Error, meta?: Record<string, any>) =>
        this.logger.error(`[${pluginId}] ${message}`, error, meta),
      debug: (message: string, meta?: Record<string, any>) =>
        this.logger.debug(`[${pluginId}] ${message}`, meta)
    };
  }

  private validatePermission(context: PluginContext, method: string, payload: any): boolean {
    // Simple permission validation - in a real implementation,
    // this would be more sophisticated based on the method and payload
    const permissions = context.permissions;

    // Define method-to-permission mapping
    const methodPermissions: Record<string, Permission[]> = {
      'analyze': ['screen'],
      'capture': ['screen'],
      'clipboard.read': ['clipboard'],
      'clipboard.write': ['clipboard'],
      'automate': ['automation'],
      'network.request': ['network'],
      'filesystem.read': ['filesystem'],
      'filesystem.write': ['filesystem'],
      'camera.capture': ['camera'],
      'microphone.record': ['microphone']
    };

    const requiredPermissions = methodPermissions[method] || [];
    return requiredPermissions.every(permission => permissions.has(permission));
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeout);

      fn().then(
        result => {
          clearTimeout(timer);
          resolve(result);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}

// Factory function for creating plugin bus
export function createPluginBus(logger: Logger): PluginBus {
  return new PluginBus(logger);
}