import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Plugin,
  PluginMessage,
  PluginResponse,
  PluginManifest,
  PluginContext,
  UUID,
  Schemas
} from '@free-cluely/shared';

export interface PluginBusOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class PluginBus {
  private plugins = new Map<string, Plugin>();
  private eventEmitter = new EventEmitter();
  private pendingRequests = new Map<UUID, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private options: Required<PluginBusOptions>;

  constructor(options: PluginBusOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000
    };
  }

  /**
   * Register a plugin with the bus
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    const manifest = plugin.manifest;

    // Validate manifest
    const validation = Schemas.PluginManifest.safeParse(manifest);
    if (!validation.success) {
      throw new Error(`Invalid plugin manifest: ${validation.error.message}`);
    }

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }

    this.plugins.set(manifest.id, plugin);

    // Create plugin context
    const context: PluginContext = {
      id: manifest.id,
      sendMessage: async (message: PluginMessage) => {
        return this.sendMessage(message);
      },
      getConfig: () => {
        return this.getPluginConfig(manifest.id);
      },
      setConfig: async (config: Record<string, any>) => {
        await this.setPluginConfig(manifest.id, config);
      },
      log: (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
        this.log(level, message, data, manifest.id);
      }
    };

    try {
      await plugin.initialize();

      // Set up message handler for this plugin
      this.eventEmitter.on(`message:${manifest.id}`, async (message: PluginMessage) => {
        try {
          const response = await plugin.handleMessage(message);
          this.eventEmitter.emit(`response:${message.id}`, response);
        } catch (error) {
          this.eventEmitter.emit(`response:${message.id}`, {
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          });
        }
      });

      this.log('info', `Plugin ${manifest.name} registered successfully`, { id: manifest.id });
    } catch (error) {
      this.plugins.delete(manifest.id);
      throw error;
    }
  }

  /**
   * Unregister a plugin from the bus
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    try {
      await plugin.destroy();
      this.plugins.delete(pluginId);
      this.eventEmitter.removeAllListeners(`message:${pluginId}`);
      this.log('info', `Plugin ${plugin.manifest.name} unregistered successfully`, { id: pluginId });
    } catch (error) {
      this.log('error', `Error unregistering plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * Send a message to a specific plugin
   */
  async sendMessage(message: PluginMessage, timeout?: number): Promise<PluginResponse> {
    const validation = Schemas.PluginMessage.safeParse(message);
    if (!validation.success) {
      throw new Error(`Invalid message: ${validation.error.message}`);
    }

    const plugin = this.plugins.get(message.plugin);
    if (!plugin) {
      throw new Error(`Plugin ${message.plugin} is not registered`);
    }

    const timeoutMs = timeout ?? this.options.timeout;

    return new Promise((resolve, reject) => {
      const responseHandler = (response: PluginResponse) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.id);

        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Plugin returned error'));
        }
      };

      const timeoutHandler = () => {
        this.eventEmitter.removeListener(`response:${message.id}`, responseHandler);
        this.pendingRequests.delete(message.id);
        reject(new Error(`Plugin ${message.plugin} timed out after ${timeoutMs}ms`));
      };

      const timeoutId = setTimeout(timeoutHandler, timeoutMs);

      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout: timeoutId
      });

      this.eventEmitter.once(`response:${message.id}`, responseHandler);
      this.eventEmitter.emit(`message:${message.plugin}`, message);
    });
  }

  /**
   * Broadcast a message to all registered plugins
   */
  async broadcastMessage(message: Omit<PluginMessage, 'id' | 'timestamp'>): Promise<PluginResponse[]> {
    const fullMessage: PluginMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    const promises: Promise<PluginResponse>[] = [];

    for (const pluginId of this.plugins.keys()) {
      const pluginMessage = { ...fullMessage, plugin: pluginId };
      promises.push(this.sendMessage(pluginMessage));
    }

    try {
      const responses = await Promise.allSettled(promises);

      return responses.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              id: uuidv4(),
              success: false,
              error: result.reason?.message || 'Unknown error',
              timestamp: Date.now()
            }
      );
    } catch (error) {
      this.log('error', 'Error broadcasting message', { error });
      return [];
    }
  }

  /**
   * Send a message with retry logic
   */
  async sendMessageWithRetry(
    message: PluginMessage,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<PluginResponse> {
    const retries = maxRetries ?? this.options.maxRetries;
    const delay = retryDelay ?? this.options.retryDelay;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.sendMessage(message);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        this.log('warn', `Plugin message failed, retrying...`, {
          plugin: message.plugin,
          method: message.method,
          attempt: attempt + 1,
          maxRetries: retries,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }

    throw new Error('Unexpected error in retry logic');
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.manifest);
  }

  /**
   * Check if a plugin is registered
   */
  isPluginRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugin configuration (placeholder - would integrate with config system)
   */
  private getPluginConfig(pluginId: string): Record<string, any> {
    // This would integrate with the config system
    return {};
  }

  /**
   * Set plugin configuration (placeholder - would integrate with config system)
   */
  private async setPluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
    // This would integrate with the config system
    this.log('info', `Setting config for plugin ${pluginId}`, { config });
  }

  /**
   * Centralized logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any, source?: string): void {
    const logEntry = {
      level,
      message,
      data,
      source: source || 'PluginBus',
      timestamp: Date.now()
    };

    console.log(`[${level.toUpperCase()}] ${logEntry.source}: ${message}`, data || '');

    // Emit log event for external listeners
    this.eventEmitter.emit('log', logEntry);
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.log('info', 'Destroying PluginBus...');

    // Unregister all plugins
    const unregisterPromises = Array.from(this.plugins.keys()).map(id =>
      this.unregisterPlugin(id)
    );

    await Promise.allSettled(unregisterPromises);

    // Clear pending requests
    for (const [, { timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
    }
    this.pendingRequests.clear();

    // Remove all listeners
    this.eventEmitter.removeAllListeners();

    this.log('info', 'PluginBus destroyed');
  }
}