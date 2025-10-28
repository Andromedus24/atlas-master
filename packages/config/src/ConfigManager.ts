import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { keytar } from 'keytar';
import { z } from 'zod';
import { AppConfig, Schemas, AIProviderConfig, DataConnectorConfig, WidgetConfig } from '@free-cluely/shared';

export interface ConfigManagerOptions {
  configPath?: string;
  keychainService?: string;
  keychainAccount?: string;
  encryptionKey?: string;
}

export class ConfigManager {
  private config: AppConfig;
  private configPath: string;
  private keychainService: string;
  private keychainAccount: string;
  private encryptionKey?: string;
  private configWatchers = new Set<(config: AppConfig) => void>();
  private isInitialized = false;

  constructor(options: ConfigManagerOptions = {}) {
    this.configPath = options.configPath || path.join(app?.getPath('userData') || os.homedir(), '.atlas', 'config.json');
    this.keychainService = options.keychainService || 'atlas-config';
    this.keychainAccount = options.keychainAccount || 'api-keys';
    this.encryptionKey = options.encryptionKey;
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure config directory exists
      await this.ensureConfigDirectory();

      // Load or create default configuration
      await this.loadConfig();

      this.isInitialized = true;
      console.log('ConfigManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigManager:', error);
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return structuredClone(this.config);
  }

  /**
   * Update the configuration
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }

    try {
      // Merge updates with current config
      const newConfig = { ...this.config, ...updates };

      // Validate the new configuration
      const validation = Schemas.AppConfig.safeParse(newConfig);
      if (!validation.success) {
        throw new Error(`Invalid configuration: ${validation.error.message}`);
      }

      // Update internal config
      this.config = validation.data;

      // Save to disk
      await this.saveConfig();

      // Notify watchers
      this.notifyWatchers();

      console.log('Configuration updated successfully');
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Get AI provider configuration
   */
  getAIProviderConfig(provider?: string): AIProviderConfig | undefined {
    const targetProvider = provider || this.config.ai.defaultProvider;
    return this.config.ai.providers.find(p => p.provider === targetProvider);
  }

  /**
   * Set AI provider configuration
   */
  async setAIProviderConfig(provider: string, config: Partial<AIProviderConfig>): Promise<void> {
    const existingIndex = this.config.ai.providers.findIndex(p => p.provider === provider);

    if (existingIndex >= 0) {
      this.config.ai.providers[existingIndex] = {
        ...this.config.ai.providers[existingIndex],
        ...config
      };
    } else {
      this.config.ai.providers.push({
        provider: provider as any,
        ...config
      });
    }

    await this.updateConfig({});
  }

  /**
   * Get data connector configuration
   */
  getDataConnectorConfig(id: string): DataConnectorConfig | undefined {
    return this.config.dataConnectors.find(c => c.id === id);
  }

  /**
   * Add or update data connector configuration
   */
  async setDataConnectorConfig(config: DataConnectorConfig): Promise<void> {
    const existingIndex = this.config.dataConnectors.findIndex(c => c.id === config.id);

    if (existingIndex >= 0) {
      this.config.dataConnectors[existingIndex] = config;
    } else {
      this.config.dataConnectors.push(config);
    }

    await this.updateConfig({});
  }

  /**
   * Remove data connector configuration
   */
  async removeDataConnectorConfig(id: string): Promise<void> {
    this.config.dataConnectors = this.config.dataConnectors.filter(c => c.id !== id);
    await this.updateConfig({});
  }

  /**
   * Get widget configuration
   */
  getWidgetConfig(id: string): WidgetConfig | undefined {
    return this.config.widgets.find(w => w.id === id);
  }

  /**
   * Add or update widget configuration
   */
  async setWidgetConfig(config: WidgetConfig): Promise<void> {
    const existingIndex = this.config.widgets.findIndex(w => w.id === config.id);

    if (existingIndex >= 0) {
      this.config.widgets[existingIndex] = config;
    } else {
      this.config.widgets.push(config);
    }

    await this.updateConfig({});
  }

  /**
   * Remove widget configuration
   */
  async removeWidgetConfig(id: string): Promise<void> {
    this.config.widgets = this.config.widgets.filter(w => w.id !== id);
    await this.updateConfig({});
  }

  /**
   * Securely store an API key
   */
  async storeAPIKey(provider: string, apiKey: string): Promise<void> {
    try {
      const keyId = `${provider}_api_key`;
      await keytar.setPassword(this.keychainService, keyId, apiKey);
      console.log(`API key for ${provider} stored securely`);
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a stored API key
   */
  async getAPIKey(provider: string): Promise<string | null> {
    try {
      const keyId = `${provider}_api_key`;
      return await keytar.getPassword(this.keychainService, keyId);
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Delete a stored API key
   */
  async deleteAPIKey(provider: string): Promise<void> {
    try {
      const keyId = `${provider}_api_key`;
      await keytar.deletePassword(this.keychainService, keyId);
      console.log(`API key for ${provider} deleted`);
    } catch (error) {
      console.error(`Failed to delete API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Watch for configuration changes
   */
  watchConfig(callback: (config: AppConfig) => void): () => void {
    this.configWatchers.add(callback);

    return () => {
      this.configWatchers.delete(callback);
    };
  }

  /**
   * Export configuration (without sensitive data)
   */
  async exportConfig(): Promise<string> {
    const exportableConfig = {
      ...this.config,
      ai: {
        ...this.config.ai,
        providers: this.config.ai.providers.map(p => ({
          ...p,
          apiKey: p.apiKey ? '[REDACTED]' : undefined
        }))
      }
    };

    return JSON.stringify(exportableConfig, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);

      // Validate imported configuration
      const validation = Schemas.AppConfig.safeParse(importedConfig);
      if (!validation.success) {
        throw new Error(`Invalid configuration format: ${validation.error.message}`);
      }

      // For security, don't import API keys - they must be set separately
      const sanitizedConfig = {
        ...validation.data,
        ai: {
          ...validation.data.ai,
          providers: validation.data.ai.providers.map(p => ({
            ...p,
            apiKey: undefined
          }))
        }
      };

      await this.updateConfig(sanitizedConfig);

      console.log('Configuration imported successfully');
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
    this.notifyWatchers();
    console.log('Configuration reset to defaults');
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  /**
   * Load configuration from disk
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData);

      // Validate loaded configuration
      const validation = Schemas.AppConfig.safeParse(loadedConfig);
      if (!validation.success) {
        console.warn('Loaded configuration is invalid, using defaults:', validation.error.message);
        this.config = this.getDefaultConfig();
      } else {
        this.config = validation.data;
      }
    } catch (error) {
      // File doesn't exist or is corrupted, use defaults
      console.log('No existing configuration found, using defaults');
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Notify configuration watchers
   */
  private notifyWatchers(): void {
    const configCopy = structuredClone(this.config);
    this.configWatchers.forEach(callback => {
      try {
        callback(configCopy);
      } catch (error) {
        console.error('Error in configuration watcher:', error);
      }
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        defaultProvider: 'anthropic',
        providers: [
          {
            provider: 'anthropic',
            apiKey: undefined,
            model: 'claude-3-sonnet-20240229',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 60000
          }
        ]
      },
      permissions: {
        allowlist: [],
        restrictions: []
      },
      storage: {
        dataPath: path.join(app?.getPath('userData') || os.homedir(), '.atlas', 'data'),
        maxJobs: 50000,
        retentionDays: 30
      },
      ui: {
        theme: 'auto',
        animations: true,
        compactMode: false
      },
      plugins: {
        enabled: [],
        trustedPaths: []
      },
      dataConnectors: [],
      widgets: []
    };
  }
}