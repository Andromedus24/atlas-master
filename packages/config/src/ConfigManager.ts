import { z } from 'zod';
import {
  AppConfig,
  AppConfigSchema,
  AIProvider,
  Permission,
  Logger,
  generateId
} from '@free-cluely/shared';
import { SecureStorage } from './SecureStorage';
import { EnvironmentManager } from './EnvironmentManager';
import { ConfigValidator } from './ConfigValidator';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private secureStorage: SecureStorage;
  private environmentManager: EnvironmentManager;
  private validator: ConfigValidator;
  private logger: Logger;
  private configPath: string;

  private constructor() {
    this.configPath = this.getConfigPath();
    this.secureStorage = new SecureStorage();
    this.environmentManager = new EnvironmentManager();
    this.validator = new ConfigValidator();
    this.logger = this.createLogger();

    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getConfigPath(): string {
    // In Electron main process, use app data directory
    // In renderer process or Node.js, use current directory
    if (typeof window !== 'undefined' && window.electron) {
      return window.electron.app.getPath('userData');
    }
    return process.cwd();
  }

  private createLogger(): Logger {
    return {
      debug: (message: string, meta?: Record<string, any>) => {
        if (this.config.logging.level === 'debug') {
          console.debug(`[ConfigManager] ${message}`, meta);
        }
      },
      info: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info'].includes(this.config.logging.level)) {
          console.info(`[ConfigManager] ${message}`, meta);
        }
      },
      warn: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info', 'warn'].includes(this.config.logging.level)) {
          console.warn(`[ConfigManager] ${message}`, meta);
        }
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[ConfigManager] ${message}`, error, meta);
      }
    };
  }

  private loadConfig(): AppConfig {
    try {
      // Try to load from secure storage first (for sensitive data)
      const secureConfig = this.loadSecureConfig();

      // Load from environment variables
      const envConfig = this.loadEnvironmentConfig();

      // Merge configurations with secure data taking precedence
      const mergedConfig = {
        ...envConfig,
        ai: {
          ...envConfig.ai,
          providers: {
            ...envConfig.ai.providers,
            ...secureConfig.ai?.providers,
          }
        }
      };

      // Validate and return config
      return this.validator.validate(mergedConfig);
    } catch (error) {
      this.logger.error('Failed to load configuration', error as Error);
      return this.getDefaultConfig();
    }
  }

  private loadSecureConfig(): Partial<AppConfig> {
    try {
      const configPath = `${this.configPath}/config.secure.json`;
      const encryptedData = this.secureStorage.readFile(configPath);

      if (!encryptedData) {
        return {};
      }

      return JSON.parse(encryptedData);
    } catch (error) {
      this.logger.warn('Could not load secure config, using defaults', { error: error.message });
      return {};
    }
  }

  private loadEnvironmentConfig(): Partial<AppConfig> {
    return {
      ai: {
        defaultProvider: (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'anthropic',
        providers: {
          anthropic: process.env.ANTHROPIC_API_KEY ? {
            apiKey: process.env.ANTHROPIC_API_KEY,
          } : undefined,
          google: process.env.GOOGLE_AI_API_KEY ? {
            apiKey: process.env.GOOGLE_AI_API_KEY,
          } : undefined,
          ollama: process.env.OLLAMA_BASE_URL ? {
            baseUrl: process.env.OLLAMA_BASE_URL,
          } : undefined,
          openai: process.env.OPENAI_API_KEY ? {
            apiKey: process.env.OPENAI_API_KEY,
          } : undefined,
        }
      },
      permissions: {
        autoPrompt: process.env.PERMISSION_AUTO_PROMPT === 'true',
        allowed: this.parsePermissions(process.env.PERMISSION_ALLOWED || ''),
        automationAllowlist: process.env.AUTOMATION_ALLOWLIST ?
          process.env.AUTOMATION_ALLOWLIST.split(',') : []
      },
      security: {
        pluginIsolation: process.env.PLUGIN_ISOLATION_ENABLED !== 'false',
        pluginTimeout: parseInt(process.env.PLUGIN_TIMEOUT_MS || '30000'),
        maxJobDuration: parseInt(process.env.MAX_JOB_DURATION_MS || '300000')
      },
      performance: {
        cacheTtl: parseInt(process.env.CACHE_TTL_MS || '3600000'),
        maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE_MB || '100'),
        enableMetrics: process.env.ENABLE_METRICS === 'true'
      },
      logging: {
        level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE === 'true'
      }
    };
  }

  private parsePermissions(permissionsStr: string): Permission[] {
    if (!permissionsStr) return [];

    return permissionsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => this.isValidPermission(p)) as Permission[];
  }

  private isValidPermission(permission: string): permission is Permission {
    return ['screen', 'clipboard', 'automation', 'network', 'filesystem'].includes(permission as Permission);
  }

  private validateConfig(): void {
    try {
      this.validator.validate(this.config);

      // Check for required API keys
      if (!this.config.ai.providers.anthropic?.apiKey &&
          !this.config.ai.providers.google?.apiKey &&
          !this.config.ai.providers.ollama?.baseUrl &&
          !this.config.ai.providers.openai?.apiKey) {
        this.logger.warn('No AI provider API keys configured. Some features will not work.');
      }

    } catch (error) {
      this.logger.error('Configuration validation failed', error as Error);
      throw error;
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        defaultProvider: 'anthropic',
        providers: {}
      },
      permissions: {
        autoPrompt: true,
        allowed: ['screen', 'clipboard', 'automation', 'network'],
        automationAllowlist: []
      },
      security: {
        pluginIsolation: true,
        pluginTimeout: 30000,
        maxJobDuration: 300000
      },
      performance: {
        cacheTtl: 3600000,
        maxCacheSize: 100,
        enableMetrics: false
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false
      }
    };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    try {
      const newConfig = this.validator.mergeConfigs(this.config, updates);

      // Separate secure and non-secure data
      const { secureData, nonSecureData } = this.separateSecureData(newConfig);

      // Save secure data to encrypted storage
      if (Object.keys(secureData).length > 0) {
        this.saveSecureConfig(secureData);
      }

      // Update in-memory config
      this.config = { ...this.config, ...nonSecureData };
      this.validateConfig();

      this.logger.info('Configuration updated successfully');
    } catch (error) {
      this.logger.error('Failed to update configuration', error as Error);
      throw error;
    }
  }

  private separateSecureData(config: AppConfig): {
    secureData: Partial<AppConfig>;
    nonSecureData: Partial<AppConfig>;
  } {
    const secureData: Partial<AppConfig> = {
      ai: {
        providers: {
          anthropic: config.ai.providers.anthropic,
          google: config.ai.providers.google,
          ollama: config.ai.providers.ollama,
          openai: config.ai.providers.openai,
        }
      }
    };

    const nonSecureData: Partial<AppConfig> = {
      ai: {
        defaultProvider: config.ai.defaultProvider,
        providers: {}
      },
      permissions: config.permissions,
      security: config.security,
      performance: config.performance,
      logging: config.logging
    };

    return { secureData, nonSecureData };
  }

  private saveSecureConfig(secureData: Partial<AppConfig>): void {
    try {
      const configPath = `${this.configPath}/config.secure.json`;
      const jsonData = JSON.stringify(secureData, null, 2);
      this.secureStorage.writeFile(configPath, jsonData);

      this.logger.debug('Secure configuration saved');
    } catch (error) {
      this.logger.error('Failed to save secure configuration', error as Error);
      throw error;
    }
  }

  public getAIProviderConfig(provider: AIProvider): { apiKey?: string; baseUrl?: string; model?: string } | null {
    const providerConfig = this.config.ai.providers[provider];
    if (!providerConfig) return null;

    switch (provider) {
      case 'anthropic':
      case 'google':
      case 'openai':
        return { apiKey: providerConfig.apiKey };
      case 'ollama':
        return { baseUrl: providerConfig.baseUrl };
      default:
        return null;
    }
  }

  public isPermissionAllowed(permission: Permission): boolean {
    return this.config.permissions.allowed.includes(permission);
  }

  public isDomainAllowed(domain: string): boolean {
    return this.config.permissions.automationAllowlist.length === 0 ||
           this.config.permissions.automationAllowlist.includes(domain);
  }

  public async reloadConfig(): Promise<void> {
    this.logger.info('Reloading configuration...');
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public exportConfig(): string {
    // Export non-sensitive configuration data only
    const exportableConfig = {
      ai: {
        defaultProvider: this.config.ai.defaultProvider,
        providers: {} // Don't export API keys
      },
      permissions: this.config.permissions,
      security: this.config.security,
      performance: this.config.performance,
      logging: this.config.logging
    };

    return JSON.stringify(exportableConfig, null, 2);
  }

  public importConfig(configJson: string, merge: boolean = false): void {
    try {
      const importedConfig = JSON.parse(configJson);

      if (merge) {
        this.updateConfig(importedConfig);
      } else {
        // For full import, we need to be careful about sensitive data
        this.logger.warn('Full config import may overwrite sensitive data like API keys');
        this.updateConfig(importedConfig);
      }

      this.logger.info('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import configuration', error as Error);
      throw error;
    }
  }
}