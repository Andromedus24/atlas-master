import { z } from 'zod';

// =============================================================================
// CORE SYSTEM TYPES
// =============================================================================

export type JobType = 'chat' | 'analyze' | 'generate' | 'automate' | 'ingest';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type Permission = 'screen' | 'clipboard' | 'automation' | 'network' | 'filesystem';
export type AIProvider = 'anthropic' | 'google' | 'ollama' | 'openai';

// =============================================================================
// PLUGIN SYSTEM TYPES
// =============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: Permission[];
  capabilities: string[];
  entryPoint: string;
  dependencies?: Record<string, string>;
}

export interface PluginContext {
  id: string;
  permissions: Permission[];
  config: Record<string, any>;
  logger: Logger;
}

export interface Plugin {
  manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  execute(method: string, payload: any): Promise<any>;
  destroy(): Promise<void>;
}

// =============================================================================
// JOB SYSTEM TYPES
// =============================================================================

export interface JobMetadata {
  id: string;
  type: JobType;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  userId?: string;
  sessionId?: string;
  pluginId?: string;
  aiProvider?: AIProvider;
  model?: string;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  cost?: {
    amount: number;
    currency: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface Job extends JobMetadata {
  payload: Record<string, any>;
  result?: Record<string, any>;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
}

// =============================================================================
// AI PROVIDER TYPES
// =============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChatRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIChatResponse {
  message: AIMessage;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    amount: number;
    currency: string;
  };
}

export interface AIVisionRequest {
  imageData: string; // base64
  prompt: string;
  model?: string;
  detail?: 'low' | 'high';
}

export interface AIVisionResponse {
  description: string;
  confidence: number;
  objects?: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: string; // OCR result
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AIImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface AIImageGenerationResponse {
  imageData: string; // base64
  prompt: string;
  model: string;
  usage: {
    cost: number;
  };
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface AppConfig {
  ai: {
    defaultProvider: AIProvider;
    providers: {
      anthropic?: {
        apiKey: string;
        model?: string;
      };
      google?: {
        apiKey: string;
        model?: string;
      };
      ollama?: {
        baseUrl: string;
        model?: string;
      };
      openai?: {
        apiKey: string;
        model?: string;
      };
    };
  };
  permissions: {
    autoPrompt: boolean;
    allowed: Permission[];
    automationAllowlist: string[];
  };
  security: {
    pluginIsolation: boolean;
    pluginTimeout: number;
    maxJobDuration: number;
  };
  performance: {
    cacheTtl: number;
    maxCacheSize: number;
    enableMetrics: boolean;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableFile: boolean;
  };
}

// =============================================================================
// PLUGIN BUS TYPES
// =============================================================================

export interface PluginBusMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  plugin: string;
  method: string;
  payload: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface PluginBusResponse extends PluginBusMessage {
  type: 'response';
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

// =============================================================================
// AUTOMATION TYPES
// =============================================================================

export interface AutomationAction {
  type: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'navigate';
  selector?: string;
  text?: string;
  duration?: number;
  url?: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  actions: AutomationAction[];
  trigger?: {
    type: 'schedule' | 'hotkey' | 'manual';
    schedule?: string; // cron format
    hotkey?: string;
  };
}

// =============================================================================
// SECURITY TYPES
// =============================================================================

export interface PermissionRequest {
  pluginId: string;
  permission: Permission;
  reason: string;
  domain?: string;
}

export interface PermissionGrant {
  pluginId: string;
  permission: Permission;
  granted: boolean;
  grantedAt: Date;
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
}

export interface Metrics {
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  tokens?: number;
  cost?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const AIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
});

export const AIChatRequestSchema = z.object({
  messages: z.array(AIMessageSchema),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  stream: z.boolean().optional(),
});

export const JobMetadataSchema = z.object({
  id: z.string(),
  type: z.enum(['chat', 'analyze', 'generate', 'automate', 'ingest']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  pluginId: z.string().optional(),
  aiProvider: z.enum(['anthropic', 'google', 'ollama', 'openai']).optional(),
  model: z.string().optional(),
  tokens: z.object({
    input: z.number().optional(),
    output: z.number().optional(),
    total: z.number().optional(),
  }).optional(),
  cost: z.object({
    amount: z.number(),
    currency: z.string(),
  }).optional(),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
  }).optional(),
});

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  permissions: z.array(z.enum(['screen', 'clipboard', 'automation', 'network', 'filesystem'])),
  capabilities: z.array(z.string()),
  entryPoint: z.string(),
  dependencies: z.record(z.string()).optional(),
});

export const AppConfigSchema = z.object({
  ai: z.object({
    defaultProvider: z.enum(['anthropic', 'google', 'ollama', 'openai']),
    providers: z.object({
      anthropic: z.object({
        apiKey: z.string(),
        model: z.string().optional(),
      }).optional(),
      google: z.object({
        apiKey: z.string(),
        model: z.string().optional(),
      }).optional(),
      ollama: z.object({
        baseUrl: z.string(),
        model: z.string().optional(),
      }).optional(),
      openai: z.object({
        apiKey: z.string(),
        model: z.string().optional(),
      }).optional(),
    }),
  }),
  permissions: z.object({
    autoPrompt: z.boolean(),
    allowed: z.array(z.enum(['screen', 'clipboard', 'automation', 'network', 'filesystem'])),
    automationAllowlist: z.array(z.string()),
  }),
  security: z.object({
    pluginIsolation: z.boolean(),
    pluginTimeout: z.number(),
    maxJobDuration: z.number(),
  }),
  performance: z.object({
    cacheTtl: z.number(),
    maxCacheSize: z.number(),
    enableMetrics: z.boolean(),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    enableConsole: z.boolean(),
    enableFile: z.boolean(),
  }),
});

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isJob = (obj: any): obj is Job => JobMetadataSchema.safeParse(obj).success;
export const isPluginManifest = (obj: any): obj is PluginManifest =>
  PluginManifestSchema.safeParse(obj).success;
export const isAppConfig = (obj: any): obj is AppConfig => AppConfigSchema.safeParse(obj).success;
export const isAIChatRequest = (obj: any): obj is AIChatRequest =>
  AIChatRequestSchema.safeParse(obj).success;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const isValidPermission = (permission: string): permission is Permission =>
  ['screen', 'clipboard', 'automation', 'network', 'filesystem'].includes(permission);

export const isValidJobType = (type: string): type is JobType =>
  ['chat', 'analyze', 'generate', 'automate', 'ingest'].includes(type);

export const isValidAIProvider = (provider: string): provider is AIProvider =>
  ['anthropic', 'google', 'ollama', 'openai'].includes(provider);