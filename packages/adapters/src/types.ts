import { z } from 'zod';
import { AIMessage, AIProviderConfig } from '@free-cluely/shared';

// Base adapter interface
export interface AIAdapter {
  readonly provider: string;
  readonly config: AIProviderConfig;

  initialize(): Promise<void>;
  chat(messages: AIMessage[]): Promise<AIMessage>;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  isHealthy(): Promise<boolean>;
}

// Image generation options
export const ImageGenerationOptionsSchema = z.object({
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  count: z.number().min(1).max(10).default(1)
});

export type ImageGenerationOptions = z.infer<typeof ImageGenerationOptionsSchema>;

export const ImageGenerationResultSchema = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    revisedPrompt: z.string().optional(),
    b64_json: z.string().optional()
  })),
  usage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional()
  }).optional()
});

export type ImageGenerationResult = z.infer<typeof ImageGenerationResultSchema>;

// Chat completion options
export const ChatCompletionOptionsSchema = z.object({
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
  stop: z.array(z.string()).optional()
});

export type ChatCompletionOptions = z.infer<typeof ChatCompletionOptionsSchema>;

// Provider-specific configurations
export const OpenAIConfigSchema = z.object({
  provider: z.literal('openai'),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  model: z.string().default('gpt-4'),
  organization: z.string().optional()
});

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;

export const AnthropicConfigSchema = z.object({
  provider: z.literal('anthropic'),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  model: z.string().default('claude-3-sonnet-20240229'),
  version: z.string().default('2023-06-01')
});

export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>;

export const GoogleGeminiConfigSchema = z.object({
  provider: z.literal('google-gemini'),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  model: z.string().default('gemini-pro')
});

export type GoogleGeminiConfig = z.infer<typeof GoogleGeminiConfigSchema>;

export const OllamaConfigSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().default('http://localhost:11434'),
  model: z.string().default('llama2')
});

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

// Adapter factory type
export type AdapterConfig = OpenAIConfig | AnthropicConfig | GoogleGeminiConfig | OllamaConfig;

export interface AdapterFactory {
  createAdapter(config: AdapterConfig): AIAdapter;
  getProviderName(): string;
  isConfigValid(config: Partial<AdapterConfig>): boolean;
}