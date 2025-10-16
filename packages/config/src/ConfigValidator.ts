import { z } from 'zod';
import { AppConfig, AppConfigSchema, AIProvider, Permission } from '@free-cluely/shared';
import { Logger } from '@free-cluely/shared';

export class ConfigValidator {
  private logger: Logger;

  constructor() {
    this.logger = {
      debug: (msg) => console.debug(`[ConfigValidator] ${msg}`),
      info: (msg) => console.info(`[ConfigValidator] ${msg}`),
      warn: (msg) => console.warn(`[ConfigValidator] ${msg}`),
      error: (msg, err) => console.error(`[ConfigValidator] ${msg}`, err)
    };
  }

  public validate(config: any): AppConfig {
    try {
      const result = AppConfigSchema.safeParse(config);

      if (!result.success) {
        const errors = result.error.format();
        this.logger.error('Configuration validation failed', undefined, { errors });
        throw new Error(`Invalid configuration: ${JSON.stringify(errors, null, 2)}`);
      }

      this.logger.debug('Configuration validation successful');
      return result.data;
    } catch (error) {
      this.logger.error('Configuration validation error', error as Error);
      throw error;
    }
  }

  public validatePartial(config: Partial<AppConfig>): Partial<AppConfig> {
    try {
      // Create a partial schema for validation
      const partialSchema = AppConfigSchema.partial();
      const result = partialSchema.safeParse(config);

      if (!result.success) {
        const errors = result.error.format();
        this.logger.error('Partial configuration validation failed', undefined, { errors });
        throw new Error(`Invalid partial configuration: ${JSON.stringify(errors, null, 2)}`);
      }

      return result.data;
    } catch (error) {
      this.logger.error('Partial configuration validation error', error as Error);
      throw error;
    }
  }

  public mergeConfigs(baseConfig: AppConfig, updates: Partial<AppConfig>): AppConfig {
    try {
      // Deep merge the configurations
      const merged = {
        ai: {
          ...baseConfig.ai,
          ...updates.ai,
          providers: {
            ...baseConfig.ai.providers,
            ...updates.ai?.providers
          }
        },
        permissions: {
          ...baseConfig.permissions,
          ...updates.permissions
        },
        security: {
          ...baseConfig.security,
          ...updates.security
        },
        performance: {
          ...baseConfig.performance,
          ...updates.performance
        },
        logging: {
          ...baseConfig.logging,
          ...updates.logging
        }
      };

      // Validate the merged configuration
      return this.validate(merged);
    } catch (error) {
      this.logger.error('Configuration merge failed', error as Error);
      throw error;
    }
  }

  public validateAIProviderConfig(provider: AIProvider, config: any): boolean {
    try {
      switch (provider) {
        case 'anthropic':
          return this.validateAnthropicConfig(config);
        case 'google':
          return this.validateGoogleConfig(config);
        case 'ollama':
          return this.validateOllamaConfig(config);
        case 'openai':
          return this.validateOpenAIConfig(config);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`AI provider validation failed for ${provider}`, error as Error);
      return false;
    }
  }

  private validateAnthropicConfig(config: any): boolean {
    return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
  }

  private validateGoogleConfig(config: any): boolean {
    return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
  }

  private validateOllamaConfig(config: any): boolean {
    if (!config || !config.baseUrl) return false;

    try {
      new URL(config.baseUrl);
      return true;
    } catch {
      return false;
    }
  }

  private validateOpenAIConfig(config: any): boolean {
    return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
  }

  public validatePermissions(permissions: Permission[]): boolean {
    const validPermissions: Permission[] = ['screen', 'clipboard', 'automation', 'network', 'filesystem'];

    return Array.isArray(permissions) &&
           permissions.length > 0 &&
           permissions.every(p => validPermissions.includes(p));
  }

  public validateAutomationAllowlist(domains: string[]): boolean {
    if (!Array.isArray(domains)) return false;

    return domains.every(domain => {
      if (typeof domain !== 'string' || domain.length === 0) return false;

      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*)*$/;
      return domainRegex.test(domain);
    });
  }

  public sanitizeConfig(config: AppConfig): AppConfig {
    // Remove any potentially dangerous values
    const sanitized = JSON.parse(JSON.stringify(config));

    // Ensure timeout values are reasonable
    if (sanitized.security.pluginTimeout < 1000) {
      sanitized.security.pluginTimeout = 1000;
      this.logger.warn('Plugin timeout too low, setting to minimum of 1000ms');
    }

    if (sanitized.security.pluginTimeout > 300000) {
      sanitized.security.pluginTimeout = 300000;
      this.logger.warn('Plugin timeout too high, setting to maximum of 300000ms');
    }

    if (sanitized.security.maxJobDuration < 10000) {
      sanitized.security.maxJobDuration = 10000;
      this.logger.warn('Max job duration too low, setting to minimum of 10000ms');
    }

    if (sanitized.security.maxJobDuration > 1800000) {
      sanitized.security.maxJobDuration = 1800000;
      this.logger.warn('Max job duration too high, setting to maximum of 1800000ms');
    }

    return this.validate(sanitized);
  }

  public getConfigErrors(config: any): string[] {
    try {
      const result = AppConfigSchema.safeParse(config);

      if (result.success) {
        return [];
      }

      return this.formatZodErrors(result.error);
    } catch (error) {
      return [`Validation error: ${(error as Error).message}`];
    }
  }

  private formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
  }

  public isConfigComplete(config: AppConfig): boolean {
    // Check if at least one AI provider is configured
    const hasAIProvider =
      config.ai.providers.anthropic?.apiKey ||
      config.ai.providers.google?.apiKey ||
      config.ai.providers.ollama?.baseUrl ||
      config.ai.providers.openai?.apiKey;

    return hasAIProvider;
  }
}