import {
  AIChatRequest,
  AIChatResponse,
  AIVisionRequest,
  AIVisionResponse,
  AIImageGenerationRequest,
  AIImageGenerationResponse,
  AIMessage
} from '@free-cluely/shared';
import { BaseAdapter } from './BaseAdapter';

interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AnthropicMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicAdapter extends BaseAdapter {
  private client: any;
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    super('anthropic', config);
    this.config = config;

    // Initialize Anthropic client (would use actual SDK in production)
    this.client = this.createClient();
  }

  private createClient(): any {
    // In production, this would use the official Anthropic SDK
    // For now, we'll simulate the client
    return {
      messages: {
        create: async (params: any) => this.makeRequest(params)
      }
    };
  }

  private async makeRequest(params: any): Promise<AnthropicResponse> {
    // In production, this would make actual HTTP requests to Anthropic API
    // For now, we'll simulate the API call

    const { messages, model, max_tokens, temperature, system } = params;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate response based on input
    const lastMessage = messages[messages.length - 1];
    const inputTokens = Math.floor(lastMessage.content.length / 4); // Rough token estimation
    const outputTokens = Math.floor(Math.random() * 100) + 50;

    return {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: `This is a simulated response from Claude. Input tokens: ${inputTokens}, Output tokens: ${outputTokens}.`
      }],
      model: model || 'claude-3-sonnet-20240229',
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }
    };
  }

  public async chat(request: AIChatRequest): Promise<AIChatResponse> {
    try {
      if (!this.validateRequest(request)) {
        throw new Error('Invalid chat request');
      }

      this.logger.debug('Processing chat request', {
        messageCount: request.messages.length,
        model: request.model || this.config.model
      });

      // Convert messages to Anthropic format
      const anthropicMessages = this.formatMessages(request.messages);

      // Prepare request parameters
      const params = {
        model: request.model || this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: request.maxTokens || this.config.maxTokens || 1024,
        temperature: request.temperature || this.config.temperature || 0.7,
        messages: anthropicMessages,
        system: this.extractSystemMessage(request.messages)
      };

      // Make API request
      const response = await this.client.messages.create(params);

      // Convert response to standard format
      const aiResponse: AIChatResponse = {
        message: {
          role: 'assistant',
          content: response.content[0]?.text || '',
          timestamp: new Date()
        },
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        cost: this.calculateCost({
          input: response.usage.input_tokens,
          output: response.usage.output_tokens
        }, params.model)
      };

      this.logger.debug('Chat request completed', {
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        cost: aiResponse.cost
      });

      return aiResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async vision(request: AIVisionRequest): Promise<AIVisionResponse> {
    try {
      if (!this.validateRequest(request)) {
        throw new Error('Invalid vision request');
      }

      this.logger.debug('Processing vision request');

      // Convert image data and prompt to Anthropic format
      const messages: AnthropicMessage[] = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: this.detectImageType(request.imageData),
              data: request.imageData
            }
          },
          {
            type: 'text',
            text: request.prompt
          }
        ]
      }];

      // Make API request
      const response = await this.client.messages.create({
        model: request.model || this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages
      });

      // Parse response for vision analysis
      const responseText = response.content[0]?.text || '';

      // Extract structured information from response
      const visionResponse: AIVisionResponse = {
        description: responseText,
        confidence: 0.9, // Simulated confidence
        objects: this.extractObjects(responseText),
        text: this.extractText(responseText),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };

      return visionResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    // Anthropic doesn't have image generation capabilities
    throw new Error('Image generation not supported by Anthropic adapter');
  }

  public async isHealthy(): Promise<boolean> {
    try {
      // Test with a simple request
      await this.chat({
        messages: [{
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }],
        maxTokens: 10
      });

      return true;
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      return false;
    }
  }

  private formatMessages(messages: AIMessage[]): AnthropicMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
  }

  private extractSystemMessage(messages: AIMessage[]): string | undefined {
    const systemMessage = messages.find(msg => msg.role === 'system');
    return systemMessage?.content;
  }

  private detectImageType(imageData: string): string {
    // Simple image type detection based on data
    if (imageData.startsWith('/9j/')) return 'image/jpeg';
    if (imageData.startsWith('iVBORw0KGgo')) return 'image/png';
    if (imageData.startsWith('R0lGODlh')) return 'image/gif';
    if (imageData.startsWith('UklGR')) return 'image/webp';

    return 'image/jpeg'; // Default fallback
  }

  private extractObjects(text: string): Array<{ name: string; confidence: number; boundingBox?: any }> {
    // Simple object extraction from text (in production, this would be more sophisticated)
    const objects = [];

    // Look for common object mentions in the response
    const objectKeywords = ['person', 'car', 'dog', 'cat', 'building', 'tree', 'phone', 'computer'];

    for (const keyword of objectKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        objects.push({
          name: keyword,
          confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
        });
      }
    }

    return objects;
  }

  private extractText(text: string): string {
    // For OCR, return the response text itself (in production, this would extract actual text from image)
    return text;
  }

  private calculateCost(tokens: { input?: number; output?: number }, model?: string): {
    amount: number;
    currency: string;
  } {
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;

    // Anthropic pricing (as of 2024)
    let inputCostPerToken = 0.000003; // $0.003 per 1k tokens
    let outputCostPerToken = 0.000015; // $0.015 per 1k tokens

    // Adjust for different models
    if (model?.includes('haiku')) {
      inputCostPerToken = 0.00000025;
      outputCostPerToken = 0.00000125;
    } else if (model?.includes('sonnet')) {
      inputCostPerToken = 0.000003;
      outputCostPerToken = 0.000015;
    }

    const inputCost = (inputTokens / 1000) * inputCostPerToken;
    const outputCost = (outputTokens / 1000) * outputCostPerToken;
    const totalCost = inputCost + outputCost;

    return {
      amount: Math.round(totalCost * 1000000) / 1000000,
      currency: 'USD'
    };
  }
}