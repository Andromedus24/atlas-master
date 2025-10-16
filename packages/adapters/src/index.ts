// AI Provider Adapters
export { BaseAdapter } from './BaseAdapter';
export { AnthropicAdapter } from './AnthropicAdapter';
export { GoogleAdapter } from './GoogleAdapter';
export { OllamaAdapter } from './OllamaAdapter';
export { OpenAIAdapter } from './OpenAIAdapter';

// Adapter Manager
export { AdapterManager } from './AdapterManager';

// Re-export types for convenience
export type {
  AIProvider,
  AIChatRequest,
  AIChatResponse,
  AIVisionRequest,
  AIVisionResponse,
  AIImageGenerationRequest,
  AIImageGenerationResponse
} from '@free-cluely/shared';