import {
  DataConnector,
  DataIngestionJob,
  Job,
  JobStatus,
  Logger
} from '@free-cluely/shared';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import axios, { AxiosResponse } from 'axios';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface ConnectorConfig {
  id: string;
  name: string;
  type: 'url' | 'api' | 'csv' | 'database';
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT';
  body?: any;
  filePath?: string;
  schedule?: string; // cron expression
  enabled: boolean;
  mapping?: Record<string, string>; // field mapping
  filters?: Record<string, any>;
}

export class DataConnectorManager extends EventEmitter {
  private connectors: Map<string, DataConnector> = new Map();
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private logger: Logger;
  private isRunning = false;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.isRunning = true;
    this.logger.info('Data connector manager initialized');
  }

  async addConnector(config: ConnectorConfig): Promise<void> {
    const connector: DataConnector = {
      id: config.id,
      name: config.name,
      type: config.type,
      config,
      enabled: config.enabled,
      schedule: config.schedule,
    };

    this.connectors.set(config.id, connector);

    if (config.enabled && config.schedule) {
      await this.scheduleConnector(config.id);
    }

    this.emit('connector-added', connector);
    this.logger.info(`Added data connector: ${config.name}`);
  }

  async removeConnector(connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    // Stop scheduled job if exists
    if (this.jobs.has(connectorId)) {
      this.jobs.get(connectorId)!.stop();
      this.jobs.delete(connectorId);
    }

    this.connectors.delete(connectorId);
    this.emit('connector-removed', connector);
    this.logger.info(`Removed data connector: ${connector.name}`);
  }

  async runConnector(connectorId: string, manual: boolean = false): Promise<Job> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    if (!connector.enabled && !manual) {
      throw new Error(`Connector ${connectorId} is disabled`);
    }

    const job: DataIngestionJob = {
      id: `ingestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'ingest',
      status: 'running',
      title: `Data ingestion: ${connector.name}`,
      description: `Manual data ingestion from ${connector.name}`,
      payload: {
        connectorId,
        manual,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
      startedAt: Date.now(),
      connectorId,
      format: this.getDataFormat(connector.config),
      mapping: connector.config.mapping,
    };

    try {
      this.emit('job-started', job);

      const data = await this.fetchData(connector.config);

      job.status = 'completed';
      job.completedAt = Date.now();
      job.result = {
        success: true,
        recordCount: Array.isArray(data) ? data.length : 1,
        data: data,
      };

      // Update connector last run time
      connector.lastRun = Date.now();
      if (connector.schedule) {
        connector.nextRun = this.calculateNextRun(connector.schedule);
      }

      this.emit('job-completed', job);
      this.logger.info(`Data ingestion completed: ${connector.name}`, {
        recordCount: Array.isArray(data) ? data.length : 1
      });

    } catch (error) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = (error as Error).message;

      this.emit('job-failed', job);
      this.logger.error(`Data ingestion failed: ${connector.name}`, error as Error);

      throw error;
    }

    return job;
  }

  private async fetchData(config: ConnectorConfig): Promise<any> {
    switch (config.type) {
      case 'url':
        return await this.fetchUrlData(config);
      case 'api':
        return await this.fetchApiData(config);
      case 'csv':
        return await this.fetchCsvData(config);
      default:
        throw new Error(`Unsupported connector type: ${config.type}`);
    }
  }

  private async fetchUrlData(config: ConnectorConfig): Promise<any> {
    if (!config.url) {
      throw new Error('URL is required for URL connector type');
    }

    const response: AxiosResponse = await axios.get(config.url, {
      headers: config.headers || {},
      timeout: 30000,
    });

    // Try to parse as JSON, fallback to text
    try {
      return typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;
    } catch {
      return response.data;
    }
  }

  private async fetchApiData(config: ConnectorConfig): Promise<any> {
    if (!config.url) {
      throw new Error('URL is required for API connector type');
    }

    const requestConfig: any = {
      url: config.url,
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      timeout: 30000,
    };

    if (config.apiKey) {
      requestConfig.headers.Authorization = `Bearer ${config.apiKey}`;
    }

    if (config.body && (config.method === 'POST' || config.method === 'PUT')) {
      requestConfig.data = config.body;
    }

    const response: AxiosResponse = await axios(requestConfig);

    return typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;
  }

  private async fetchCsvData(config: ConnectorConfig): Promise<any[]> {
    if (!config.filePath) {
      throw new Error('File path is required for CSV connector type');
    }

    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(config.filePath!)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            // Apply field mapping if specified
            return config.mapping?.[header] || header;
          },
          skipEmptyLines: true,
        }))
        .on('data', (data) => {
          // Apply filters if specified
          if (this.applyFilters(data, config.filters)) {
            results.push(data);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private applyFilters(data: any, filters?: Record<string, any>): boolean {
    if (!filters) return true;

    for (const [key, value] of Object.entries(filters)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  private getDataFormat(config: ConnectorConfig): 'json' | 'csv' | 'xml' | 'text' {
    switch (config.type) {
      case 'csv':
        return 'csv';
      case 'url':
      case 'api':
        return 'json'; // Assume JSON for APIs and URLs
      default:
        return 'json';
    }
  }

  private async scheduleConnector(connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (!connector || !connector.schedule) {
      return;
    }

    // Stop existing job if any
    if (this.jobs.has(connectorId)) {
      this.jobs.get(connectorId)!.stop();
    }

    try {
      const scheduledTask = cron.schedule(connector.schedule, async () => {
        try {
          await this.runConnector(connectorId, false);
        } catch (error) {
          this.logger.error(`Scheduled connector ${connectorId} failed`, error as Error);
        }
      }, {
        scheduled: false,
      });

      this.jobs.set(connectorId, scheduledTask);
      scheduledTask.start();

      // Calculate next run time
      connector.nextRun = this.calculateNextRun(connector.schedule);

      this.logger.info(`Scheduled connector: ${connector.name}`, {
        schedule: connector.schedule,
        nextRun: connector.nextRun,
      });

    } catch (error) {
      this.logger.error(`Failed to schedule connector ${connectorId}`, error as Error);
    }
  }

  private calculateNextRun(cronExpression: string): number {
    try {
      const interval = cron.parseExpression(cronExpression);
      return interval.next().getTime();
    } catch (error) {
      this.logger.error('Failed to calculate next run time', error as Error);
      return Date.now() + 3600000; // Default to 1 hour
    }
  }

  getConnectors(): DataConnector[] {
    return Array.from(this.connectors.values());
  }

  getConnector(connectorId: string): DataConnector | undefined {
    return this.connectors.get(connectorId);
  }

  async updateConnector(connectorId: string, updates: Partial<ConnectorConfig>): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    const updatedConfig = { ...connector.config, ...updates };
    const updatedConnector: DataConnector = {
      ...connector,
      ...updates,
      config: updatedConfig,
    };

    this.connectors.set(connectorId, updatedConnector);

    // Reschedule if schedule or enabled status changed
    if (updates.schedule !== undefined || updates.enabled !== undefined) {
      if (this.jobs.has(connectorId)) {
        this.jobs.get(connectorId)!.stop();
        this.jobs.delete(connectorId);
      }

      if (updatedConnector.enabled && updatedConnector.schedule) {
        await this.scheduleConnector(connectorId);
      }
    }

    this.emit('connector-updated', updatedConnector);
    this.logger.info(`Updated data connector: ${updatedConnector.name}`);
  }

  async destroy(): Promise<void> {
    this.isRunning = false;

    // Stop all scheduled jobs
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();

    this.removeAllListeners();
    this.logger.info('Data connector manager destroyed');
  }
}

// Factory function
export function createDataConnectorManager(logger: Logger): DataConnectorManager {
  return new DataConnectorManager(logger);
}