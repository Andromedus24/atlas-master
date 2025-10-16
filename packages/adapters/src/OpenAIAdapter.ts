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

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high';
    };
  }>;
}

interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export class OpenAIAdapter extends BaseAdapter {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super('openai', config);
    this.config = config;
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

      // Prepare request for OpenAI API
      const openaiRequest = {
        model: request.model || this.config.model || 'gpt-3.5-turbo',
        messages: this.formatMessages(request.messages),
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature || 0.7,
        stream: false
      };

      // Make API request to OpenAI
      const response = await this.makeRequest('/chat/completions', openaiRequest);

      // Convert response to standard format
      const aiResponse: AIChatResponse = {
        message: {
          role: 'assistant',
          content: response.choices[0]?.message?.content || '',
          timestamp: new Date()
        },
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        cost: this.calculateCost({
          input: response.usage.prompt_tokens,
          output: response.usage.completion_tokens
        }, openaiRequest.model)
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

      // Prepare request for OpenAI Vision API
      const openaiRequest = {
        model: request.model || this.config.model || 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: request.prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${this.detectImageType(request.imageData)};base64,${request.imageData}`,
                detail: request.detail || 'auto'
              }
            }
          ]
        }],
        max_tokens: 1024,
        temperature: 0.7
      };

      // Make API request to OpenAI
      const response = await this.makeRequest('/chat/completions', openaiRequest);

      // Parse response for vision analysis
      const responseText = response.choices[0]?.message?.content || '';

      const visionResponse: AIVisionResponse = {
        description: responseText,
        confidence: 0.9, // Simulated confidence
        objects: this.extractObjects(responseText),
        text: this.extractText(responseText),
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        }
      };

      return visionResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    try {
      if (!this.validateRequest(request)) {
        throw new Error('Invalid image generation request');
      }

      this.logger.debug('Processing image generation request');

      // Prepare request for OpenAI DALL-E API
      const openaiRequest = {
        model: request.model || 'dall-e-3',
        prompt: request.prompt,
        n: 1,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid'
      };

      // Make API request to OpenAI
      const response = await this.makeRequest('/images/generations', openaiRequest);

      // Convert response to standard format
      const imageResponse: AIImageGenerationResponse = {
        imageData: response.data[0]?.url || '', // URL to generated image
        prompt: request.prompt,
        model: openaiRequest.model,
        usage: {
          cost: this.calculateImageGenerationCost(openaiRequest.model, openaiRequest.size)
        }
      };

      this.logger.debug('Image generation completed', {
        model: imageResponse.model,
        cost: imageResponse.usage.cost
      });

      return imageResponse;
    } catch (error) {
      this.handleError(error);
    }
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

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const baseUrl = 'https://api.openai.com/v1';
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  private formatMessages(messages: AIMessage[]): OpenAIMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
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
    // Simple object extraction from text
    const objects = [];

    const objectKeywords = ['person', 'car', 'dog', 'cat', 'building', 'tree', 'phone', 'computer'];

    for (const keyword of objectKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        objects.push({
          name: keyword,
          confidence: Math.random() * 0.3 + 0.7
        });
      }
    }

    return objects;
  }

  private extractText(text: string): string {
    // For OCR, return the response text itself
    return text;
  }

  private calculateCost(tokens: { input?: number; output?: number }, model?: string): {
    amount: number;
    currency: string;
  } {
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;

    // OpenAI pricing (as of 2024)
    let inputCostPerToken = 0.0000015; // $0.0015 per 1k tokens
    let outputCostPerToken = 0.000002; // $0.002 per 1k tokens

    // Adjust for different models
    if (model?.includes('gpt-4')) {
      if (model.includes('vision')) {
        inputCostPerToken = 0.00001; // GPT-4 Vision input
        outputCostPerToken = 0.00003; // GPT-4 Vision output
      } else {
        inputCostPerToken = 0.00003; // GPT-4 input
        outputCostPerToken = 0.00006; // GPT-4 output
      }
    } else if (model?.includes('gpt-3.5')) {
      inputCostPerToken = 0.0000015;
      outputCostPerToken = 0.000002;
    }

    const inputCost = (inputTokens / 1000) * inputCostPerToken;
    const outputCost = (outputTokens / 1000) * outputCostPerToken;
    const totalCost = inputCost + outputCost;

    return {
      amount: Math.round(totalCost * 1000000) / 1000000,
      currency: 'USD'
    };
  }

  private calculateImageGenerationCost(model: string, size: string): number {
    // OpenAI DALL-E pricing (as of 2024)
    if (model === 'dall-e-3') {
      if (size === '1024x1024') return 0.04;
      if (size === '1024x1792' || size === '1792x1024') return 0.08;
    } else if (model === 'dall-e-2') {
      if (size === '256x256') return 0.016;
      if (size === '512x512') return 0.018;
      if (size === '1024x1024') return 0.02;
    }

    return 0.04; // Default fallback
  }
}