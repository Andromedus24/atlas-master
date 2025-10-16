export * from './types';
export * from './connectors/URLConnector';

// Placeholder exports for other connectors (to be implemented)
export class APIConnector {
  readonly config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // TODO: Implement API connector
  }

  async fetch(): Promise<any> {
    // TODO: Implement API fetch
    throw new Error('API connector not yet implemented');
  }

  async isHealthy(): Promise<boolean> {
    return false;
  }

  async destroy(): Promise<void> {
    // TODO: Implement API connector cleanup
  }
}

export class CSVConnector {
  readonly config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // TODO: Implement CSV connector
  }

  async fetch(): Promise<any> {
    // TODO: Implement CSV fetch
    throw new Error('CSV connector not yet implemented');
  }

  async isHealthy(): Promise<boolean> {
    return false;
  }

  async destroy(): Promise<void> {
    // TODO: Implement CSV connector cleanup
  }
}

// Connector factory
import { ConnectorConfig, DataConnector } from './types';
import { URLConnector } from './connectors/URLConnector';

export class ConnectorFactory {
  static createConnector(config: ConnectorConfig): DataConnector {
    switch (config.type) {
      case 'url':
        return new URLConnector(config as any);
      case 'api':
        return new APIConnector(config);
      case 'csv':
        return new CSVConnector(config);
      default:
        throw new Error(`Unsupported connector type: ${config.type}`);
    }
  }

  static getConnectorType(config: ConnectorConfig): string {
    return config.type;
  }

  static isConfigValid(config: Partial<ConnectorConfig>): boolean {
    // Basic validation
    return !!(config.type && config.id && config.name);
  }
}

// Data connector manager for handling multiple connectors
export class DataConnectorManager {
  private connectors = new Map<string, DataConnector>();
  private cronJobs = new Map<string, any>();

  async registerConnector(connector: DataConnector): Promise<void> {
    const config = connector.config;

    if (this.connectors.has(config.id)) {
      throw new Error(`Connector ${config.id} is already registered`);
    }

    await connector.initialize();
    this.connectors.set(config.id, connector);

    // Set up scheduled fetching if configured
    if (config.schedule) {
      this.scheduleConnector(config.id, config.schedule);
    }

    console.log(`Data connector ${config.name} registered`);
  }

  async unregisterConnector(connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} is not registered`);
    }

    // Stop scheduled job if exists
    if (this.cronJobs.has(connectorId)) {
      this.cronJobs.get(connectorId).destroy();
      this.cronJobs.delete(connectorId);
    }

    await connector.destroy();
    this.connectors.delete(connectorId);

    console.log(`Data connector ${connectorId} unregistered`);
  }

  async fetchConnectorData(connectorId: string): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} is not registered`);
    }

    return await connector.fetch();
  }

  async fetchAllConnectorData(): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const [id, connector] of this.connectors) {
      try {
        const result = await connector.fetch();
        results.set(id, result);
      } catch (error) {
        console.error(`Failed to fetch data from connector ${id}:`, error);
        results.set(id, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  getRegisteredConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }

  isConnectorRegistered(connectorId: string): boolean {
    return this.connectors.has(connectorId);
  }

  private scheduleConnector(connectorId: string, schedule: string): void {
    try {
      const cron = require('node-cron');
      const job = cron.schedule(schedule, async () => {
        console.log(`Running scheduled fetch for connector ${connectorId}`);
        try {
          await this.fetchConnectorData(connectorId);
        } catch (error) {
          console.error(`Scheduled fetch failed for connector ${connectorId}:`, error);
        }
      });

      this.cronJobs.set(connectorId, job);
    } catch (error) {
      console.error(`Failed to schedule connector ${connectorId}:`, error);
    }
  }

  async destroy(): Promise<void> {
    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      job.destroy();
    }
    this.cronJobs.clear();

    // Destroy all connectors
    const destroyPromises = Array.from(this.connectors.values()).map(connector =>
      connector.destroy()
    );

    await Promise.allSettled(destroyPromises);
    this.connectors.clear();

    console.log('DataConnectorManager destroyed');
  }
}