import { Logger } from '@free-cluely/shared';

export class EnvironmentManager {
  private logger: Logger;
  private environment: 'development' | 'production' | 'test';

  constructor() {
    this.logger = {
      debug: (msg) => console.debug(`[EnvironmentManager] ${msg}`),
      info: (msg) => console.info(`[EnvironmentManager] ${msg}`),
      warn: (msg) => console.warn(`[EnvironmentManager] ${msg}`),
      error: (msg, err) => console.error(`[EnvironmentManager] ${msg}`, err)
    };

    this.environment = this.detectEnvironment();
  }

  private detectEnvironment(): 'development' | 'production' | 'test' {
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }

    if (process.env.NODE_ENV === 'test') {
      return 'test';
    }

    // Check for development indicators
    if (process.env.NODE_ENV === 'development' ||
        process.argv.some(arg => arg.includes('dev')) ||
        !process.env.NODE_ENV) {
      return 'development';
    }

    return 'development';
  }

  public getEnvironment(): 'development' | 'production' | 'test' {
    return this.environment;
  }

  public isDevelopment(): boolean {
    return this.environment === 'development';
  }

  public isProduction(): boolean {
    return this.environment === 'production';
  }

  public isTest(): boolean {
    return this.environment === 'test';
  }

  public getEnvironmentVariable(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  public getEnvironmentVariableAsNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
    }

    return parsed;
  }

  public getEnvironmentVariableAsBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }

    return value.toLowerCase() === 'true' || value === '1';
  }

  public requireEnvironmentVariable(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  public validateRequiredVariables(requiredVars: string[]): void {
    const missing = requiredVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  public getAllEnvironmentVariables(): Record<string, string | undefined> {
    return { ...process.env };
  }

  public getEnvironmentVariablesWithPrefix(prefix: string): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};

    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix)) {
        result[key.substring(prefix.length)] = process.env[key];
      }
    });

    return result;
  }

  public setEnvironmentVariable(key: string, value: string): void {
    process.env[key] = value;
    this.logger.debug(`Environment variable set: ${key}`);
  }

  public unsetEnvironmentVariable(key: string): void {
    delete process.env[key];
    this.logger.debug(`Environment variable unset: ${key}`);
  }

  public expandEnvironmentVariables(value: string): string {
    // Simple environment variable expansion
    return value.replace(/\$\{([^}]+)\}/g, (match, key) => {
      return process.env[key] || match;
    });
  }

  public getEnvironmentInfo(): {
    environment: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion?: string;
  } {
    return {
      environment: this.environment,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    };
  }
}