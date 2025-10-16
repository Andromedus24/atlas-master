import { ConfigManager } from '@free-cluely/config';
import {
  AIProvider,
  AIChatRequest,
  AIChatResponse,
  AIVisionRequest,
  AIVisionResponse,
  AIImageGenerationRequest,
  AIImageGenerationResponse,
  Logger
} from '@free-cluely/shared';

import { BaseAdapter } from './BaseAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { GoogleAdapter } from './GoogleAdapter';
import { OllamaAdapter } from './OllamaAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';

export class AdapterManager {
  private static instance: AdapterManager;
  private adapters: Map<AIProvider, BaseAdapter> = new Map();
  private configManager: ConfigManager;
  private logger: Logger;
  private currentProvider: AIProvider;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.logger = this.createLogger();
    this.currentProvider = this.configManager.getConfigValue('ai').defaultProvider;

    this.initializeAdapters();
  }

  public static getInstance(): AdapterManager {
    if (!AdapterManager.instance) {
      AdapterManager.instance = new AdapterManager();
    }
    return AdapterManager.instance;
  }

  private createLogger(): Logger {
    return {
      debug: (message: string, meta?: Record<string, any>) => {
        if (this.configManager.getConfigValue('logging').level === 'debug') {
          console.debug(`[AdapterManager] ${message}`, meta);
        }
      },
      info: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info'].includes(this.configManager.getConfigValue('logging').level)) {
          console.info(`[AdapterManager] ${message}`, meta);
        }
      },
      warn: (message: string, meta?: Record<string, any>) => {
        if (['debug', 'info', 'warn'].includes(this.configManager.getConfigValue('logging').level)) {
          console.warn(`[AdapterManager] ${message}`, meta);
        }
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[AdapterManager] ${message}`, error, meta);
      }
    };
  }

  private initializeAdapters(): void {
    const config = this.configManager.getConfig();

    // Initialize Anthropic adapter if configured
    if (config.ai.providers.anthropic?.apiKey) {
      this.adapters.set('anthropic', new AnthropicAdapter(config.ai.providers.anthropic));
      this.logger.info('Anthropic adapter initialized');
    }

    // Initialize Google adapter if configured
    if (config.ai.providers.google?.apiKey) {
      this.adapters.set('google', new GoogleAdapter(config.ai.providers.google));
      this.logger.info('Google adapter initialized');
    }

    // Initialize Ollama adapter if configured
    if (config.ai.providers.ollama?.baseUrl) {
      this.adapters.set('ollama', new OllamaAdapter(config.ai.providers.ollama));
      this.logger.info('Ollama adapter initialized');
    }

    // Initialize OpenAI adapter if configured
    if (config.ai.providers.openai?.apiKey) {
      this.adapters.set('openai', new OpenAIAdapter(config.ai.providers.openai));
      this.logger.info('OpenAI adapter initialized');
    }

    this.logger.info(`Initialized ${this.adapters.size} AI provider adapters`);
  }

  public async chat(request: AIChatRequest, provider?: AIProvider): Promise<AIChatResponse> {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.adapters.get(targetProvider);

    if (!adapter) {
      throw new Error(`No adapter available for provider: ${targetProvider}`);
    }

    try {
      this.logger.debug(`Routing chat request to ${targetProvider}`);
      return await adapter.chat(request);
    } catch (error) {
      this.logger.error(`Chat request failed for ${targetProvider}`, error as Error);

      // Try fallback provider if available
      if (provider && this.adapters.size > 1) {
        this.logger.info(`Attempting fallback to another provider`);
        return await this.chatWithFallback(request, targetProvider);
      }

      throw error;
    }
  }

  public async vision(request: AIVisionRequest, provider?: AIProvider): Promise<AIVisionResponse> {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.adapters.get(targetProvider);

    if (!adapter) {
      throw new Error(`No adapter available for provider: ${targetProvider}`);
    }

    if (!adapter.vision) {
      throw new Error(`Vision not supported by provider: ${targetProvider}`);
    }

    try {
      this.logger.debug(`Routing vision request to ${targetProvider}`);
      return await adapter.vision(request);
    } catch (error) {
      this.logger.error(`Vision request failed for ${targetProvider}`, error as Error);

      // Try fallback provider if available and supports vision
      if (provider && this.adapters.size > 1) {
        this.logger.info(`Attempting fallback to another provider`);
        return await this.visionWithFallback(request, targetProvider);
      }

      throw error;
    }
  }

  public async generateImage(request: AIImageGenerationRequest, provider?: AIProvider): Promise<AIImageGenerationResponse> {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.adapters.get(targetProvider);

    if (!adapter) {
      throw new Error(`No adapter available for provider: ${targetProvider}`);
    }

    if (!adapter.generateImage) {
      throw new Error(`Image generation not supported by provider: ${targetProvider}`);
    }

    try {
      this.logger.debug(`Routing image generation request to ${targetProvider}`);
      return await adapter.generateImage(request);
    } catch (error) {
      this.logger.error(`Image generation request failed for ${targetProvider}`, error as Error);

      // Try fallback provider if available and supports image generation
      if (provider && this.adapters.size > 1) {
        this.logger.info(`Attempting fallback to another provider`);
        return await this.generateImageWithFallback(request, targetProvider);
      }

      throw error;
    }
  }

  private async chatWithFallback(request: AIChatRequest, excludeProvider: AIProvider): Promise<AIChatResponse> {
    for (const [provider, adapter] of this.adapters) {
      if (provider === excludeProvider) continue;

      try {
        this.logger.debug(`Trying fallback provider: ${provider}`);
        return await adapter.chat(request);
      } catch (error) {
        this.logger.warn(`Fallback provider ${provider} also failed`, { error: (error as Error).message });
      }
    }

    throw new Error(`All providers failed for chat request`);
  }

  private async visionWithFallback(request: AIVisionRequest, excludeProvider: AIProvider): Promise<AIVisionResponse> {
    for (const [provider, adapter] of this.adapters) {
      if (provider === excludeProvider || !adapter.vision) continue;

      try {
        this.logger.debug(`Trying fallback provider: ${provider}`);
        return await adapter.vision(request);
      } catch (error) {
        this.logger.warn(`Fallback provider ${provider} also failed`, { error: (error as Error).message });
      }
    }

    throw new Error(`All providers failed for vision request`);
  }

  private async generateImageWithFallback(request: AIImageGenerationRequest, excludeProvider: AIProvider): Promise<AIImageGenerationResponse> {
    for (const [provider, adapter] of this.adapters) {
      if (provider === excludeProvider || !adapter.generateImage) continue;

      try {
        this.logger.debug(`Trying fallback provider: ${provider}`);
        return await adapter.generateImage(request);
      } catch (error) {
        this.logger.warn(`Fallback provider ${provider} also failed`, { error: (error as Error).message });
      }
    }

    throw new Error(`All providers failed for image generation request`);
  }

  public getAvailableProviders(): AIProvider[] {
    return Array.from(this.adapters.keys());
  }

  public isProviderAvailable(provider: AIProvider): boolean {
    return this.adapters.has(provider);
  }

  public getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  public setCurrentProvider(provider: AIProvider): void {
    if (!this.adapters.has(provider)) {
      throw new Error(`Provider ${provider} is not available`);
    }

    this.currentProvider = provider;
    this.logger.info(`Current provider set to: ${provider}`);
  }

  public async checkAllProvidersHealth(): Promise<Map<AIProvider, boolean>> {
    const healthResults = new Map<AIProvider, boolean>();

    for (const [provider, adapter] of this.adapters) {
      try {
        healthResults.set(provider, await adapter.isHealthy());
      } catch (error) {
        this.logger.error(`Health check failed for ${provider}`, error as Error);
        healthResults.set(provider, false);
      }
    }

    return healthResults;
  }

  public getProviderCapabilities(): Map<AIProvider, string[]> {
    const capabilities = new Map<AIProvider, string[]>();

    for (const [provider, adapter] of this.adapters) {
      const caps: string[] = [];

      if (adapter.chat) caps.push('chat');
      if (adapter.vision) caps.push('vision');
      if (adapter.generateImage) caps.push('image-generation');

      capabilities.set(provider, caps);
    }

    return capabilities;
  }

  public async reloadConfiguration(): Promise<void> {
    this.logger.info('Reloading adapter configuration...');

    // Clear existing adapters
    this.adapters.clear();

    // Reinitialize adapters with new configuration
    this.initializeAdapters();

    // Update current provider if it's no longer available
    if (!this.adapters.has(this.currentProvider)) {
      const availableProviders = this.getAvailableProviders();
      if (availableProviders.length > 0) {
        this.currentProvider = availableProviders[0];
        this.logger.info(`Current provider updated to: ${this.currentProvider}`);
      }
    }
  }

  public getAdapter(provider: AIProvider): BaseAdapter | null {
    return this.adapters.get(provider) || null;
  }

  public getAdapterStats(): {
    totalProviders: number;
    availableProviders: AIProvider[];
    capabilities: Map<AIProvider, string[]>;
    currentProvider: AIProvider;
  } {
    return {
      totalProviders: this.adapters.size,
      availableProviders: this.getAvailableProviders(),
      capabilities: this.getProviderCapabilities(),
      currentProvider: this.currentProvider
    };
  }
}