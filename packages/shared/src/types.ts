import { z } from 'zod';

// Base types
export type ID = string;
export type Timestamp = number;

// Plugin system types
export const PermissionSchema = z.enum([
  'screen',
  'clipboard',
  'automation',
  'network',
  'filesystem',
  'camera',
  'microphone'
]);

export type Permission = z.infer<typeof PermissionSchema>;

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  permissions: z.array(PermissionSchema),
  capabilities: z.array(z.string()),
  dependencies: z.array(z.string()).optional(),
  author: z.string().optional(),
  homepage: z.string().url().optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export interface Plugin {
  manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
  handleMessage(message: PluginMessage): Promise<PluginResponse>;
}

export interface PluginContext {
  config: Record<string, any>;
  permissions: Set<Permission>;
  sendMessage: (message: PluginMessage) => Promise<PluginResponse>;
  logger: Logger;
}

export interface PluginMessage {
  id: ID;
  type: 'request' | 'response' | 'event';
  plugin: string;
  method: string;
  payload: Record<string, any>;
  timestamp: Timestamp;
}

export interface PluginResponse {
  id: ID;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Timestamp;
}

// Job system types
export const JobTypeSchema = z.enum([
  'chat',
  'analyze',
  'generate',
  'automate',
  'ingest',
  'export',
  'import'
]);

export const JobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
]);

export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobSchema = z.object({
  id: z.string(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  title: z.string(),
  description: z.string().optional(),
  payload: z.record(z.any()),
  result: z.any().optional(),
  error: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  createdAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  userId: z.string().optional(),
  pluginId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export type Job = z.infer<typeof JobSchema>;

// AI Provider types
export const ProviderTypeSchema = z.enum([
  'anthropic',
  'openai',
  'google',
  'ollama',
  'local'
]);

export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export interface AIProvider {
  type: ProviderType;
  name: string;
  isAvailable(): Promise<boolean>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  vision(image: Buffer | string, prompt: string, options?: VisionOptions): Promise<VisionResponse>;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResponse>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: Buffer | string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: TokenUsage;
  model?: string;
}

export interface VisionOptions {
  model?: string;
  maxTokens?: number;
}

export interface VisionResponse {
  description: string;
  confidence: number;
  objects?: DetectedObject[];
  text?: string;
  usage?: TokenUsage;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageGenerationOptions {
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageGenerationResponse {
  imageUrl: string;
  revisedPrompt?: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Configuration types
export const ConfigSchema = z.object({
  ai: z.object({
    provider: ProviderTypeSchema,
    model: z.string(),
    apiKey: z.string(),
    baseUrl: z.string().optional(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional()
  }),
  permissions: z.object({
    screen: z.boolean(),
    clipboard: z.boolean(),
    automation: z.boolean(),
    network: z.boolean(),
    filesystem: z.boolean(),
    camera: z.boolean(),
    microphone: z.boolean(),
    allowedDomains: z.array(z.string()).optional()
  }),
  dashboard: z.object({
    port: z.number(),
    theme: z.enum(['light', 'dark', 'system']),
    autoStart: z.boolean()
  }),
  plugins: z.object({
    enabled: z.array(z.string()),
    trustedPaths: z.array(z.string()).optional()
  }),
  storage: z.object({
    dataPath: z.string(),
    maxSize: z.number().optional(),
    retentionDays: z.number().optional()
  }),
  security: z.object({
    enableAuditLog: z.boolean(),
    requireApproval: z.array(z.string()).optional(),
    maxJobHistory: z.number().optional()
  })
});

export type Config = z.infer<typeof ConfigSchema>;

// Security types
export interface SecurityAudit {
  id: ID;
  timestamp: Timestamp;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  metadata: Record<string, any>;
}

export interface PermissionRequest {
  id: ID;
  pluginId: string;
  permission: Permission;
  resource?: string;
  reason: string;
  timestamp: Timestamp;
  status: 'pending' | 'approved' | 'denied';
}

// Data connector types
export interface DataConnector {
  id: ID;
  name: string;
  type: 'url' | 'api' | 'csv' | 'database';
  config: Record<string, any>;
  schedule?: string; // cron expression
  enabled: boolean;
  lastRun?: Timestamp;
  nextRun?: Timestamp;
}

export interface DataIngestionJob extends Job {
  type: 'ingest';
  connectorId: ID;
  sourceUrl?: string;
  format: 'json' | 'csv' | 'xml' | 'text';
  mapping?: Record<string, string>;
}

// Timeline types
export interface TimelineFilter {
  types?: JobType[];
  status?: JobStatus[];
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  tags?: string[];
  userId?: string;
  pluginId?: string;
  search?: string;
}

export interface TimelinePage {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Logger interface
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

// Widget types for dashboard
export interface Widget {
  id: ID;
  type: string;
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  data?: any;
  lastUpdated?: Timestamp;
}

export interface Dashboard {
  id: ID;
  name: string;
  widgets: Widget[];
  layout: 'grid' | 'masonry';
  theme: string;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Event types
export type EventType =
  | 'job:created'
  | 'job:started'
  | 'job:completed'
  | 'job:failed'
  | 'plugin:loaded'
  | 'plugin:error'
  | 'permission:granted'
  | 'permission:denied'
  | 'config:updated'
  | 'security:violation';

export interface Event {
  id: ID;
  type: EventType;
  timestamp: Timestamp;
  source: string;
  data: Record<string, any>;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Export validation schemas
export const validateJob = (data: unknown): Job => JobSchema.parse(data);
export const validateConfig = (data: unknown): Config => ConfigSchema.parse(data);
export const validatePluginManifest = (data: unknown): PluginManifest =>
  PluginManifestSchema.parse(data);