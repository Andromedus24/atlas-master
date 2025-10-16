import { Config, ConfigSchema, validateConfig } from '@free-cluely/shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

export class ConfigManager extends EventEmitter {
  private config: Config | null = null;
  private configPath: string;
  private watchers: Map<string, fs.FileHandle> = new Map();

  constructor() {
    super();
    const userDataPath = app?.getPath('userData') || path.join(os.homedir(), '.atlas');
    this.configPath = path.join(userDataPath, 'config.json');
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      await this.loadConfig();
      await this.watchConfigFile();
    } catch (error) {
      console.error('Failed to initialize config manager:', error);
      await this.createDefaultConfig();
    }
  }

  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  async loadConfig(): Promise<Config> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(configData);
      this.config = validateConfig(parsed);
      this.emit('config-loaded', this.config);
      return this.config;
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    }
  }

  private async createDefaultConfig(): Promise<void> {
    const defaultConfig: Config = {
      ai: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: '',
        maxTokens: 4096,
        temperature: 0.7
      },
      permissions: {
        screen: true,
        clipboard: true,
        automation: false,
        network: true,
        filesystem: false,
        camera: false,
        microphone: false,
        allowedDomains: []
      },
      dashboard: {
        port: 3000,
        theme: 'system',
        autoStart: false
      },
      plugins: {
        enabled: ['vision-service', 'automation-service'],
        trustedPaths: []
      },
      storage: {
        dataPath: path.join(os.homedir(), '.atlas', 'data'),
        maxSize: 1024 * 1024 * 1024, // 1GB
        retentionDays: 30
      },
      security: {
        enableAuditLog: true,
        requireApproval: ['automation', 'filesystem'],
        maxJobHistory: 10000
      }
    };

    this.config = validateConfig(defaultConfig);
    await this.saveConfig();
    this.emit('config-created', this.config);
  }

  async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      this.emit('config-saved', this.config);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error('Config not initialized');
    }
    return this.config;
  }

  async updateConfig(updates: Partial<Config>): Promise<Config> {
    if (!this.config) {
      throw new Error('Config not initialized');
    }

    const newConfig = { ...this.config, ...updates };
    this.config = validateConfig(newConfig);
    await this.saveConfig();
    this.emit('config-updated', this.config);
    return this.config;
  }

  get<K extends keyof Config>(key: K): Config[K] {
    if (!this.config) {
      throw new Error('Config not initialized');
    }
    return this.config[key];
  }

  async set<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    await this.updateConfig({ [key]: value } as Partial<Config>);
  }

  // Environment variable helpers
  getApiKey(): string {
    return this.get('ai').apiKey || process.env.ATLAS_AI_API_KEY || '';
  }

  getDataPath(): string {
    return this.get('storage').dataPath;
  }

  isPermissionEnabled(permission: string): boolean {
    const permissions = this.get('permissions');
    return permissions[permission as keyof typeof permissions] || false;
  }

  getAllowedDomains(): string[] {
    return this.get('permissions').allowedDomains || [];
  }

  // Security helpers
  requiresApproval(permission: string): boolean {
    const requireApproval = this.get('security').requireApproval || [];
    return requireApproval.includes(permission);
  }

  isAuditEnabled(): boolean {
    return this.get('security').enableAuditLog;
  }

  // Plugin helpers
  getEnabledPlugins(): string[] {
    return this.get('plugins').enabled;
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.getEnabledPlugins().includes(pluginId);
  }

  getTrustedPaths(): string[] {
    return this.get('plugins').trustedPaths || [];
  }

  // Dashboard helpers
  getDashboardPort(): number {
    return this.get('dashboard').port;
  }

  getDashboardTheme(): 'light' | 'dark' | 'system' {
    return this.get('dashboard').theme;
  }

  shouldAutoStart(): boolean {
    return this.get('dashboard').autoStart;
  }

  private async watchConfigFile(): Promise<void> {
    try {
      const watcher = await fs.open(this.configPath, 'r');
      this.watchers.set('config', watcher);

      // Watch for changes (in a real implementation, you'd use chokidar or similar)
      // For now, we'll just set up the file handle
    } catch (error) {
      console.warn('Failed to watch config file:', error);
    }
  }

  async destroy(): Promise<void> {
    // Close file watchers
    for (const watcher of this.watchers.values()) {
      try {
        await watcher.close();
      } catch (error) {
        console.warn('Error closing watcher:', error);
      }
    }
    this.watchers.clear();
  }
}

// Singleton instance
export const configManager = new ConfigManager();