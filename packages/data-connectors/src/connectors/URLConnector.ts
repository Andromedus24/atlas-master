import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DataConnector, DataFetchResult, URLConnectorConfig } from '../types';

export class URLConnector implements DataConnector {
  readonly config: URLConnectorConfig;
  private abortController?: AbortController;

  constructor(config: URLConnectorConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Test the connection
    await this.isHealthy();
    console.log(`URL connector initialized for ${this.config.url}`);
  }

  async fetch(): Promise<DataFetchResult> {
    this.abortController = new AbortController();

    try {
      const response: AxiosResponse = await axios({
        method: this.config.method,
        url: this.config.url,
        headers: this.config.headers,
        data: this.config.body ? JSON.parse(this.config.body) : undefined,
        responseType: this.config.encoding === 'binary' ? 'arraybuffer' : 'text',
        timeout: 30000, // 30 second timeout
        signal: this.abortController.signal
      });

      let data: any;
      const contentType = response.headers['content-type'] || '';

      if (this.config.encoding === 'binary') {
        // For binary data, convert to base64
        data = Buffer.from(response.data).toString('base64');
      } else if (contentType.includes('application/json')) {
        data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } else {
        // Treat as text
        data = response.data;
      }

      return {
        success: true,
        data,
        metadata: {
          fetchedAt: Date.now(),
          size: JSON.stringify(data).length,
          format: this.detectFormat(contentType, this.config.url),
          source: this.config.url
        }
      };
    } catch (error) {
      console.error(`URL connector fetch failed for ${this.config.url}:`, error);

      return {
        success: false,
        data: null,
        metadata: {
          fetchedAt: Date.now(),
          size: 0,
          format: 'unknown',
          source: this.config.url
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.head(this.config.url, {
        timeout: 10000,
        headers: this.config.headers
      });

      // Check if we got a successful response
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    console.log(`URL connector destroyed for ${this.config.url}`);
  }

  private detectFormat(contentType: string, url: string): string {
    if (contentType.includes('application/json')) return 'json';
    if (contentType.includes('text/csv') || url.endsWith('.csv')) return 'csv';
    if (contentType.includes('text/xml') || contentType.includes('application/xml')) return 'xml';
    if (contentType.includes('text/html')) return 'html';
    if (contentType.includes('text/plain')) return 'text';
    return 'unknown';
  }

  /**
   * Get content type from URL headers
   */
  async getContentType(): Promise<string> {
    try {
      const response = await axios.head(this.config.url, {
        timeout: 5000,
        headers: this.config.headers
      });
      return response.headers['content-type'] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get content length
   */
  async getContentLength(): Promise<number | null> {
    try {
      const response = await axios.head(this.config.url, {
        timeout: 5000,
        headers: this.config.headers
      });
      const contentLength = response.headers['content-length'];
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch {
      return null;
    }
  }
}