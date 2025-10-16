import {
  AIProvider,
  AIMessage,
  AIChatRequest,
  AIChatResponse,
  AIVisionRequest,
  AIVisionResponse,
  AIImageGenerationRequest,
  AIImageGenerationResponse,
  Logger
} from '@free-cluely/shared';

export abstract class BaseAdapter {
  protected provider: AIProvider;
  protected logger: Logger;
  protected config: any;

  constructor(provider: AIProvider, config: any) {
    this.provider = provider;
    this.config = config;
    this.logger = this.createLogger();
  }

  protected createLogger(): Logger {
    return {
      debug: (message: string, meta?: Record<string, any>) => {
        console.debug(`[${this.provider}] ${message}`, meta);
      },
      info: (message: string, meta?: Record<string, any>) => {
        console.info(`[${this.provider}] ${message}`, meta);
      },
      warn: (message: string, meta?: Record<string, any>) => {
        console.warn(`[${this.provider}] ${message}`, meta);
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[${this.provider}] ${message}`, error, meta);
      }
    };
  }

  public abstract chat(request: AIChatRequest): Promise<AIChatResponse>;
  public abstract vision?(request: AIVisionRequest): Promise<AIVisionResponse>;
  public abstract generateImage?(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse>;

  public getProvider(): AIProvider {
    return this.provider;
  }

  public getConfig(): any {
    return { ...this.config };
  }

  public updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Configuration updated');
  }

  public abstract isHealthy(): Promise<boolean>;

  public async validateRequest(request: any): Promise<boolean> {
    try {
      // Basic validation - can be overridden by specific adapters
      if (!request || typeof request !== 'object') {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Request validation failed', error as Error);
      return false;
    }
  }

  protected calculateCost(tokens: { input?: number; output?: number }, model?: string): {
    amount: number;
    currency: string;
  } {
    // Default cost calculation - should be overridden by specific adapters
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;

    // Placeholder pricing - in reality, this would use actual provider pricing
    const inputCostPerToken = 0.000001; // $0.001 per 1k tokens
    const outputCostPerToken = 0.000002; // $0.002 per 1k tokens

    const inputCost = (inputTokens / 1000) * inputCostPerToken;
    const outputCost = (outputTokens / 1000) * outputCostPerToken;
    const totalCost = inputCost + outputCost;

    return {
      amount: Math.round(totalCost * 1000000) / 1000000, // Round to 6 decimal places
      currency: 'USD'
    };
  }

  protected formatMessages(messages: AIMessage[]): any {
    // Default message formatting - can be overridden by specific adapters
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  protected handleError(error: any): never {
    this.logger.error('Adapter error', error);

    if (error.response) {
      // API error response
      const status = error.response.status;
      const data = error.response.data;

      throw new Error(`API Error (${status}): ${data?.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to reach API');
    } else {
      // Other error
      throw new Error(`Adapter error: ${error.message}`);
    }
  }
}