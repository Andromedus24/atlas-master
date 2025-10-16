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

interface OllamaConfig {
  baseUrl: string;
  model?: string;
  timeout?: number;
}

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAdapter extends BaseAdapter {
  private config: OllamaConfig;
  private baseUrl: string;

  constructor(config: OllamaConfig) {
    super('ollama', config);
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
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

      // Prepare request for Ollama API
      const ollamaRequest = {
        model: request.model || this.config.model || 'llama2',
        messages: this.formatMessages(request.messages),
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1024,
        }
      };

      // Make API request to Ollama
      const response = await this.makeRequest('/api/chat', ollamaRequest);

      // Convert response to standard format
      const aiResponse: AIChatResponse = {
        message: {
          role: 'assistant',
          content: response.response || response.message?.content || '',
          timestamp: new Date()
        },
        usage: {
          inputTokens: response.prompt_eval_count || 0,
          outputTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        },
        cost: this.calculateCost({
          input: response.prompt_eval_count || 0,
          output: response.eval_count || 0
        }, ollamaRequest.model)
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

      // For vision with Ollama, we'd use a vision-capable model like llama3.2-vision
      const ollamaRequest = {
        model: request.model || this.config.model || 'llama3.2-vision',
        messages: [{
          role: 'user',
          content: request.prompt,
          images: [request.imageData] // Base64 image data
        }],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1024,
        }
      };

      // Make API request to Ollama
      const response = await this.makeRequest('/api/chat', ollamaRequest);

      // Parse response for vision analysis
      const responseText = response.response || '';

      const visionResponse: AIVisionResponse = {
        description: responseText,
        confidence: 0.8, // Simulated confidence
        objects: this.extractObjects(responseText),
        text: this.extractText(responseText),
        usage: {
          inputTokens: response.prompt_eval_count || 0,
          outputTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        }
      };

      return visionResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    // Ollama doesn't have built-in image generation
    throw new Error('Image generation not supported by Ollama adapter');
  }

  public async isHealthy(): Promise<boolean> {
    try {
      // Check if Ollama service is available
      await this.makeRequest('/api/tags', {});
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      return false;
    }
  }

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout || 30000}ms`);
      }

      throw error;
    }
  }

  private formatMessages(messages: AIMessage[]): OllamaMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private extractObjects(text: string): Array<{ name: string; confidence: number; boundingBox?: any }> {
    // Simple object extraction from text
    const objects = [];

    const objectKeywords = ['person', 'animal', 'vehicle', 'building', 'object', 'item'];

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
    // Ollama is typically free (local), but we'll simulate some cost for consistency
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;

    // Very low simulated cost for local models
    const inputCost = (inputTokens / 1000) * 0.000001; // $0.000001 per 1k tokens
    const outputCost = (outputTokens / 1000) * 0.000001; // $0.000001 per 1k tokens
    const totalCost = inputCost + outputCost;

    return {
      amount: Math.round(totalCost * 1000000) / 1000000,
      currency: 'USD'
    };
  }
}