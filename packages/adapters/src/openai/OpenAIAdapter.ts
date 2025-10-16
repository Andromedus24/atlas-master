import OpenAI from 'openai';
import {
  AIAdapter,
  AIMessage,
  ImageGenerationOptions,
  ImageGenerationResult,
  ChatCompletionOptions,
  OpenAIConfig
} from '../types';

export class OpenAIAdapter implements AIAdapter {
  readonly provider = 'openai';
  readonly config: OpenAIConfig;
  private client: OpenAI;
  private isInitialized = false;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test the connection with a simple models list call
      await this.client.models.list();
      this.isInitialized = true;
      console.log(`OpenAI adapter initialized with model: ${this.config.model}`);
    } catch (error) {
      console.error('Failed to initialize OpenAI adapter:', error);
      throw new Error(`OpenAI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(messages: AIMessage[], options?: ChatCompletionOptions): Promise<AIMessage> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop
      });

      const choice = response.choices[0];
      if (!choice.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        role: 'assistant',
        content: choice.message.content,
        timestamp: Date.now(),
        metadata: {
          provider: this.provider,
          model: this.config.model,
          usage: {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens
          },
          finishReason: choice.finish_reason
        }
      };
    } catch (error) {
      console.error('OpenAI chat completion failed:', error);
      throw new Error(`OpenAI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3', // Use DALL-E 3 for better quality
        prompt,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style || 'vivid',
        n: options?.count || 1,
        response_format: 'url'
      });

      const images = response.data.map(img => ({
        url: img.url!,
        revisedPrompt: img.revised_prompt
      }));

      return {
        images,
        usage: {
          promptTokens: 0, // OpenAI doesn't provide token usage for image generation
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      console.error('OpenAI image generation failed:', error);
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available models for this provider
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => model.id);
    } catch (error) {
      console.error('Failed to get OpenAI models:', error);
      return [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      organization: this.config.organization
    });
    this.isInitialized = false;
  }
}