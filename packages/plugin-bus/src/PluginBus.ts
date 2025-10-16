import {
  PluginBusMessage,
  PluginBusResponse,
  Plugin,
  PluginContext,
  PluginManifest,
  Permission,
  Logger,
  generateId
} from '@free-cluely/shared';
import { ConfigManager } from '@free-cluely/config';
import { MessageValidator } from './MessageValidator';
import { PermissionManager } from './PermissionManager';
import { PluginRegistry } from './PluginRegistry';

export class PluginBus {
  private static instance: PluginBus;
  private plugins: Map<string, Plugin> = new Map();
  private configManager: ConfigManager;
  private messageValidator: MessageValidator;
  private permissionManager: PermissionManager;
  private pluginRegistry: PluginRegistry;
  private logger: Logger;
  private messageHandlers: Map<string, (message: PluginBusMessage) => Promise<PluginBusResponse>> = new Map();

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.messageValidator = new MessageValidator();
    this.permissionManager = new PermissionManager();
    this.pluginRegistry = new PluginRegistry();
    this.logger = this.createLogger();

    this.setupMessageHandlers();
  }

  public static getInstance(): PluginBus {
    if (!PluginBus.instance) {
      PluginBus.instance = new PluginBus();
    }
    return PluginBus.instance;
  }

  private createLogger(): Logger {
    return {
      debug: (message: string, meta?: Record<string, any>) => {
        if (this.configManager.getConfigValue('logging').level === 'debug') {
          console.debug(`[PluginBus] ${message}`, meta);
        }
      },
      info: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info'].includes(this.configManager.getConfigValue('logging').level)) {
          console.info(`[PluginBus] ${message}`, meta);
        }
      },
      warn: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info', 'warn'].includes(this.configManager.getConfigValue('logging').level)) {
          console.warn(`[PluginBus] ${message}`, meta);
        }
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[PluginBus] ${message}`, error, meta);
      }
    };
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('register', this.handlePluginRegistration.bind(this));
    this.messageHandlers.set('execute', this.handlePluginExecution.bind(this));
    this.messageHandlers.set('permission_request', this.handlePermissionRequest.bind(this));
    this.messageHandlers.set('status', this.handleStatusRequest.bind(this));
  }

  public async registerPlugin(plugin: Plugin): Promise<void> {
    try {
      this.logger.info(`Registering plugin: ${plugin.manifest.id}`);

      // Validate plugin manifest
      if (!this.pluginRegistry.isValidManifest(plugin.manifest)) {
        throw new Error(`Invalid plugin manifest for ${plugin.manifest.id}`);
      }

      // Check permissions
      if (!this.permissionManager.validatePluginPermissions(plugin.manifest)) {
        throw new Error(`Plugin ${plugin.manifest.id} requests invalid permissions`);
      }

      // Create plugin context
      const context: PluginContext = {
        id: plugin.manifest.id,
        permissions: plugin.manifest.permissions,
        config: {},
        logger: this.createPluginLogger(plugin.manifest.id)
      };

      // Initialize plugin
      await plugin.initialize(context);

      // Store plugin
      this.plugins.set(plugin.manifest.id, plugin);

      // Register plugin in registry
      this.pluginRegistry.register(plugin.manifest);

      this.logger.info(`Plugin registered successfully: ${plugin.manifest.id}`);
    } catch (error) {
      this.logger.error(`Failed to register plugin ${plugin.manifest.id}`, error as Error);
      throw error;
    }
  }

  public async unregisterPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} is not registered`);
      }

      this.logger.info(`Unregistering plugin: ${pluginId}`);

      // Destroy plugin
      await plugin.destroy();

      // Remove from registry
      this.plugins.delete(pluginId);
      this.pluginRegistry.unregister(pluginId);

      this.logger.info(`Plugin unregistered successfully: ${pluginId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister plugin ${pluginId}`, error as Error);
      throw error;
    }
  }

  public async send(message: Omit<PluginBusMessage, 'id' | 'timestamp'>): Promise<PluginBusResponse> {
    const fullMessage: PluginBusMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    };

    try {
      this.logger.debug(`Sending message: ${fullMessage.id}`, {
        type: fullMessage.type,
        plugin: fullMessage.plugin,
        method: fullMessage.method
      });

      // Validate message
      this.messageValidator.validate(fullMessage);

      // Check permissions for the operation
      if (!await this.permissionManager.checkPermission(fullMessage.plugin, fullMessage.method)) {
        throw new Error(`Plugin ${fullMessage.plugin} does not have permission for ${fullMessage.method}`);
      }

      // Route message to appropriate handler
      const handler = this.messageHandlers.get(fullMessage.method);
      if (!handler) {
        throw new Error(`No handler found for method: ${fullMessage.method}`);
      }

      const response = await handler(fullMessage);

      this.logger.debug(`Message processed successfully: ${fullMessage.id}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to process message ${fullMessage.id}`, error as Error);

      return {
        id: generateId(),
        type: 'response',
        plugin: fullMessage.plugin,
        method: fullMessage.method,
        payload: {},
        timestamp: new Date(),
        success: false,
        error: {
          message: (error as Error).message,
          code: 'PROCESSING_ERROR'
        }
      };
    }
  }

  private async handlePluginRegistration(message: PluginBusMessage): Promise<PluginBusResponse> {
    try {
      const { pluginId, manifest } = message.payload;

      // This would be called by a plugin loader
      // For now, we'll simulate the registration process

      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: { success: true },
        timestamp: new Date(),
        success: true
      };
    } catch (error) {
      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: {},
        timestamp: new Date(),
        success: false,
        error: {
          message: (error as Error).message
        }
      };
    }
  }

  private async handlePluginExecution(message: PluginBusMessage): Promise<PluginBusResponse> {
    try {
      const { pluginId, method, payload } = message.payload;
      const plugin = this.plugins.get(pluginId);

      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      this.logger.debug(`Executing plugin method: ${pluginId}.${method}`);

      const result = await plugin.execute(method, payload);

      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: { result },
        timestamp: new Date(),
        success: true
      };
    } catch (error) {
      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: {},
        timestamp: new Date(),
        success: false,
        error: {
          message: (error as Error).message
        }
      };
    }
  }

  private async handlePermissionRequest(message: PluginBusMessage): Promise<PluginBusResponse> {
    try {
      const { pluginId, permission, reason } = message.payload;

      const granted = await this.permissionManager.requestPermission(pluginId, permission, reason);

      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: { granted },
        timestamp: new Date(),
        success: true
      };
    } catch (error) {
      return {
        id: generateId(),
        type: 'response',
        plugin: message.plugin,
        method: message.method,
        payload: {},
        timestamp: new Date(),
        success: false,
        error: {
          message: (error as Error).message
        }
      };
    }
  }

  private async handleStatusRequest(message: PluginBusMessage): Promise<PluginBusResponse> {
    const registeredPlugins = Array.from(this.plugins.keys());

    return {
      id: generateId(),
      type: 'response',
      plugin: message.plugin,
      method: message.method,
      payload: {
        registeredPlugins,
        totalPlugins: this.plugins.size,
        timestamp: new Date()
      },
      timestamp: new Date(),
      success: true
    };
  }

  public getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  public isPluginRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  public getPluginManifest(pluginId: string): PluginManifest | null {
    return this.pluginRegistry.getManifest(pluginId);
  }

  public async broadcast(event: string, payload: any): Promise<void> {
    this.logger.debug(`Broadcasting event: ${event}`, { payload });

    // Send event to all registered plugins
    const promises = Array.from(this.plugins.entries()).map(async ([pluginId, plugin]) => {
      try {
        const message: PluginBusMessage = {
          id: generateId(),
          type: 'event',
          plugin: pluginId,
          method: event,
          payload,
          timestamp: new Date()
        };

        await plugin.execute('onEvent', { event, payload: message });
      } catch (error) {
        this.logger.warn(`Failed to broadcast event to plugin ${pluginId}`, { error: (error as Error).message });
      }
    });

    await Promise.allSettled(promises);
  }

  private createPluginLogger(pluginId: string): Logger {
    return {
      debug: (message: string, meta?: Record<string, any>) => {
        if (this.configManager.getConfigValue('logging').level === 'debug') {
          console.debug(`[${pluginId}] ${message}`, meta);
        }
      },
      info: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info'].includes(this.configManager.getConfigValue('logging').level)) {
          console.info(`[${pluginId}] ${message}`, meta);
        }
      },
      warn: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info', 'warn'].includes(this.configManager.getConfigValue('logging').level)) {
          console.warn(`[${pluginId}] ${message}`, meta);
        }
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[${pluginId}] ${message}`, error, meta);
      }
    };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down PluginBus...');

    // Unregister all plugins
    const unregisterPromises = Array.from(this.plugins.keys()).map(pluginId =>
      this.unregisterPlugin(pluginId)
    );

    await Promise.allSettled(unregisterPromises);

    this.plugins.clear();
    this.logger.info('PluginBus shutdown complete');
  }
}