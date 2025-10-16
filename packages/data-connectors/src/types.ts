import { z } from 'zod';
import { DataConnectorConfig } from '@free-cluely/shared';

// Base data connector interface
export interface DataConnector {
  readonly config: DataConnectorConfig;

  initialize(): Promise<void>;
  fetch(): Promise<DataFetchResult>;
  isHealthy(): Promise<boolean>;
  destroy(): Promise<void>;
}

// Data fetch result
export const DataFetchResultSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  metadata: z.object({
    fetchedAt: z.number(),
    size: z.number(),
    format: z.string(),
    source: z.string()
  }),
  error: z.string().optional()
});

export type DataFetchResult = z.infer<typeof DataFetchResultSchema>;

// Connector-specific configurations
export const URLConnectorConfigSchema = z.object({
  ...DataConnectorConfigSchema.shape,
  type: z.literal('url'),
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  encoding: z.enum(['utf8', 'binary', 'json']).default('utf8')
});

export type URLConnectorConfig = z.infer<typeof URLConnectorConfigSchema>;

export const APIConnectorConfigSchema = z.object({
  ...DataConnectorConfigSchema.shape,
  type: z.literal('api'),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  auth: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'apikey']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    headerName: z.string().optional()
  }).optional(),
  pagination: z.object({
    type: z.enum(['none', 'offset', 'cursor', 'page']),
    limit: z.number().optional(),
    offset: z.number().optional(),
    cursor: z.string().optional(),
    pageParam: z.string().optional()
  }).optional()
});

export type APIConnectorConfig = z.infer<typeof APIConnectorConfigSchema>;

export const CSVConnectorConfigSchema = z.object({
  ...DataConnectorConfigSchema.shape,
  type: z.literal('csv'),
  url: z.string().url(),
  delimiter: z.string().default(','),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(['utf8', 'utf16', 'latin1']).default('utf8'),
  skipEmptyLines: z.boolean().default(true)
});

export type CSVConnectorConfig = z.infer<typeof CSVConnectorConfigSchema>;

// Transformation types
export const TransformationSchema = z.object({
  type: z.enum(['javascript', 'jsonpath', 'regex']),
  script: z.string(),
  outputFormat: z.enum(['json', 'csv', 'xml']).default('json')
});

export type Transformation = z.infer<typeof TransformationSchema>;

// Enhanced connector config with transformation
export const EnhancedDataConnectorConfigSchema = z.object({
  ...DataConnectorConfigSchema.shape,
  transformation: TransformationSchema.optional()
});

export type EnhancedDataConnectorConfig = z.infer<typeof EnhancedDataConnectorConfigSchema>;

// Factory type
export type ConnectorConfig = URLConnectorConfig | APIConnectorConfig | CSVConnectorConfig;

export interface ConnectorFactory {
  createConnector(config: ConnectorConfig): DataConnector;
  getConnectorType(): string;
  isConfigValid(config: Partial<ConnectorConfig>): boolean;
}