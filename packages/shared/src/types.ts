import { z } from 'zod';

// Core ID types
export type UUID = string;
export type Timestamp = number;

// Plugin System Types
export const PermissionSchema = z.enum([
  'screen',
  'clipboard',
  'automation',
  'network',
  'filesystem',
  'camera',
  'microphone',
  'system'
]);

export type Permission = z.infer<typeof PermissionSchema>;

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  permissions: z.array(PermissionSchema),
  capabilities: z.array(z.string()),
  author: z.string().optional(),
  homepage: z.string().url().optional(),
  isolated: z.boolean().default(true)
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export interface Plugin {
  readonly manifest: PluginManifest;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  handleMessage(message: PluginMessage): Promise<PluginResponse>;
}

export interface PluginContext {
  id: UUID;
  sendMessage(message: PluginMessage): Promise<PluginResponse>;
  getConfig(): Record<string, any>;
  setConfig(config: Record<string, any>): Promise<void>;
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void;
}

// Plugin Communication Types
export const PluginMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['request', 'response', 'event']),
  plugin: z.string(),
  method: z.string(),
  payload: z.record(z.any()).optional(),
  timestamp: z.number(),
  source: z.string().optional()
});

export type PluginMessage = z.infer<typeof PluginMessageSchema>;

export const PluginResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.number()
});

export type PluginResponse = z.infer<typeof PluginResponseSchema>;

// Job System Types
export const JobTypeSchema = z.enum([
  'chat',
  'analyze',
  'generate',
  'automate',
  'ingest',
  'export',
  'import',
  'sync'
]);

export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobSchema = z.object({
  id: z.string(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  title: z.string(),
  description: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
  error: z.string().optional(),
  plugin: z.string().optional(),
  userId: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export type Job = z.infer<typeof JobSchema>;

// AI Provider Types
export const AIProviderSchema = z.enum([
  'anthropic',
  'openai',
  'google-gemini',
  'ollama',
  'cohere'
]);

export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIMessageRoleSchema = z.enum(['system', 'user', 'assistant']);

export type AIMessageRole = z.infer<typeof AIMessageRoleSchema>;

export const AIMessageSchema = z.object({
  role: AIMessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional()
});

export type AIMessage = z.infer<typeof AIMessageSchema>;

export const AIProviderConfigSchema = z.object({
  provider: AIProviderSchema,
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  timeout: z.number().optional()
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// Data Connector Types
export const DataConnectorTypeSchema = z.enum([
  'url',
  'api',
  'csv',
  'json',
  'xml',
  'database'
]);

export type DataConnectorType = z.infer<typeof DataConnectorTypeSchema>;

export const DataConnectorConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DataConnectorTypeSchema,
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  schedule: z.string().optional(), // cron format
  transform: z.string().optional(), // transformation script
  enabled: z.boolean().default(true),
  lastSync: z.number().optional(),
  errorCount: z.number().default(0)
});

export type DataConnectorConfig = z.infer<typeof DataConnectorConfigSchema>;

// Widget Types
export const WidgetTypeSchema = z.enum([
  'timeline',
  'kpi',
  'chart',
  'table',
  'text',
  'image',
  'metric',
  'progress'
]);

export type WidgetType = z.infer<typeof WidgetTypeSchema>;

export const WidgetConfigSchema = z.object({
  id: z.string(),
  type: WidgetTypeSchema,
  title: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  config: z.record(z.any()),
  dataSource: z.string().optional(),
  refreshInterval: z.number().optional()
});

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// Configuration Types
export const AppConfigSchema = z.object({
  ai: z.object({
    defaultProvider: AIProviderSchema,
    providers: z.array(AIProviderConfigSchema)
  }),
  permissions: z.object({
    allowlist: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional()
  }),
  storage: z.object({
    dataPath: z.string(),
    maxJobs: z.number().default(50000),
    retentionDays: z.number().default(30)
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    animations: z.boolean().default(true),
    compactMode: z.boolean().default(false)
  }),
  plugins: z.object({
    enabled: z.array(z.string()),
    trustedPaths: z.array(z.string()).optional()
  }),
  dataConnectors: z.array(DataConnectorConfigSchema),
  widgets: z.array(WidgetConfigSchema)
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Event Types
export const AppEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
  source: z.string()
});

export type AppEvent = z.infer<typeof AppEventSchema>;

// Export all schemas for validation
export const Schemas = {
  Permission: PermissionSchema,
  PluginManifest: PluginManifestSchema,
  PluginMessage: PluginMessageSchema,
  PluginResponse: PluginResponseSchema,
  JobType: JobTypeSchema,
  JobStatus: JobStatusSchema,
  Job: JobSchema,
  AIProvider: AIProviderSchema,
  AIMessageRole: AIMessageRoleSchema,
  AIMessage: AIMessageSchema,
  AIProviderConfig: AIProviderConfigSchema,
  DataConnectorType: DataConnectorTypeSchema,
  DataConnectorConfig: DataConnectorConfigSchema,
  WidgetType: WidgetTypeSchema,
  WidgetConfig: WidgetConfigSchema,
  AppConfig: AppConfigSchema,
  AppEvent: AppEventSchema
} as const;

// Type guards
export const isValidPermission = (value: unknown): value is Permission => {
  return PermissionSchema.safeParse(value).success;
};

export const isValidJob = (value: unknown): value is Job => {
  return JobSchema.safeParse(value).success;
};

export const isValidPluginMessage = (value: unknown): value is PluginMessage => {
  return PluginMessageSchema.safeParse(value).success;
};

export const isValidPluginResponse = (value: unknown): value is PluginResponse => {
  return PluginResponseSchema.safeParse(value).success;
};