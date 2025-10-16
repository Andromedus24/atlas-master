import { z } from 'zod';
import { PluginBusMessage, JobType, Permission } from '@free-cluely/shared';
import { Logger } from '@free-cluely/shared';

export class MessageValidator {
  private logger: Logger;

  // Message schema for validation
  private messageSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['request', 'response', 'event', 'error']),
    plugin: z.string().min(1),
    method: z.string().min(1),
    payload: z.record(z.any()),
    timestamp: z.date(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
  });

  constructor() {
    this.logger = {
      debug: (msg) => console.debug(`[MessageValidator] ${msg}`),
      info: (msg) => console.info(`[MessageValidator] ${msg}`),
      warn: (msg) => console.warn(`[MessageValidator] ${msg}`),
      error: (msg, err) => console.error(`[MessageValidator] ${msg}`, err)
    };
  }

  public validate(message: any): void {
    try {
      // Basic schema validation
      const result = this.messageSchema.safeParse(message);
      if (!result.success) {
        const errors = result.error.format();
        throw new Error(`Invalid message format: ${JSON.stringify(errors, null, 2)}`);
      }

      // Additional validation based on message type
      this.validateMessageType(result.data);

      // Validate payload based on method
      this.validatePayload(result.data);

      this.logger.debug(`Message validation successful: ${message.id}`);
    } catch (error) {
      this.logger.error('Message validation failed', error as Error, { messageId: message?.id });
      throw error;
    }
  }

  private validateMessageType(message: PluginBusMessage): void {
    switch (message.type) {
      case 'request':
        if (!message.method || !message.plugin) {
          throw new Error('Request messages must have method and plugin fields');
        }
        break;

      case 'response':
        if (message.payload.success === undefined) {
          throw new Error('Response messages must have success field');
        }
        break;

      case 'event':
        if (!message.method) {
          throw new Error('Event messages must have method field');
        }
        break;

      case 'error':
        if (!message.payload.message) {
          throw new Error('Error messages must have message in payload');
        }
        break;
    }
  }

  private validatePayload(message: PluginBusMessage): void {
    const { method, payload } = message;

    switch (method) {
      case 'register':
        this.validateRegistrationPayload(payload);
        break;

      case 'execute':
        this.validateExecutionPayload(payload);
        break;

      case 'permission_request':
        this.validatePermissionRequestPayload(payload);
        break;

      case 'analyze':
        this.validateAnalysisPayload(payload);
        break;

      case 'automate':
        this.validateAutomationPayload(payload);
        break;

      case 'chat':
        this.validateChatPayload(payload);
        break;

      default:
        // For unknown methods, perform basic validation
        this.validateGenericPayload(payload);
    }
  }

  private validateRegistrationPayload(payload: any): void {
    const schema = z.object({
      pluginId: z.string().min(1),
      manifest: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        version: z.string().min(1),
        permissions: z.array(z.enum(['screen', 'clipboard', 'automation', 'network', 'filesystem'])),
        capabilities: z.array(z.string()),
        entryPoint: z.string().min(1),
      }).strict(),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid registration payload: ${result.error.message}`);
    }
  }

  private validateExecutionPayload(payload: any): void {
    const schema = z.object({
      pluginId: z.string().min(1),
      method: z.string().min(1),
      payload: z.record(z.any()),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid execution payload: ${result.error.message}`);
    }
  }

  private validatePermissionRequestPayload(payload: any): void {
    const schema = z.object({
      pluginId: z.string().min(1),
      permission: z.enum(['screen', 'clipboard', 'automation', 'network', 'filesystem']),
      reason: z.string().min(1),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid permission request payload: ${result.error.message}`);
    }
  }

  private validateAnalysisPayload(payload: any): void {
    const schema = z.object({
      imageData: z.string().min(1), // base64 image data
      prompt: z.string().min(1),
      options: z.object({
        model: z.string().optional(),
        detail: z.enum(['low', 'high']).optional(),
      }).optional(),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid analysis payload: ${result.error.message}`);
    }
  }

  private validateAutomationPayload(payload: any): void {
    const schema = z.object({
      actions: z.array(z.object({
        type: z.enum(['click', 'type', 'scroll', 'wait', 'screenshot', 'navigate']),
        selector: z.string().optional(),
        text: z.string().optional(),
        duration: z.number().optional(),
        url: z.string().optional(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }).optional(),
      })),
      options: z.object({
        domain: z.string().optional(),
        timeout: z.number().optional(),
      }).optional(),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid automation payload: ${result.error.message}`);
    }
  }

  private validateChatPayload(payload: any): void {
    const schema = z.object({
      messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1),
      })).min(1),
      options: z.object({
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().positive().optional(),
        stream: z.boolean().optional(),
      }).optional(),
    });

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(`Invalid chat payload: ${result.error.message}`);
    }
  }

  private validateGenericPayload(payload: any): void {
    // Basic payload validation - ensure it's an object and not too large
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Payload must be an object');
    }

    // Check payload size (prevent memory exhaustion)
    const payloadSize = JSON.stringify(payload).length;
    const maxPayloadSize = 1024 * 1024; // 1MB limit

    if (payloadSize > maxPayloadSize) {
      throw new Error(`Payload too large: ${payloadSize} bytes (max: ${maxPayloadSize})`);
    }

    // Check for potentially dangerous content
    this.sanitizePayload(payload);
  }

  private sanitizePayload(payload: any): void {
    // Remove any potentially dangerous keys or values
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    for (const key in payload) {
      if (dangerousKeys.includes(key.toLowerCase())) {
        throw new Error(`Dangerous key detected in payload: ${key}`);
      }

      // Recursively sanitize nested objects
      if (typeof payload[key] === 'object' && payload[key] !== null) {
        this.sanitizePayload(payload[key]);
      }
    }
  }

  public validatePluginManifest(manifest: any): void {
    const schema = z.object({
      id: z.string().min(1).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(100),
      version: z.string().min(1).regex(/^\d+\.\d+\.\d+$/),
      description: z.string().min(1).max(500),
      author: z.string().min(1).max(100),
      permissions: z.array(z.enum(['screen', 'clipboard', 'automation', 'network', 'filesystem'])),
      capabilities: z.array(z.string().min(1)),
      entryPoint: z.string().min(1),
      dependencies: z.record(z.string()).optional(),
    });

    const result = schema.safeParse(manifest);
    if (!result.success) {
      throw new Error(`Invalid plugin manifest: ${result.error.message}`);
    }
  }

  public validateJobType(type: any): type is JobType {
    const validTypes: JobType[] = ['chat', 'analyze', 'generate', 'automate', 'ingest'];
    return validTypes.includes(type);
  }

  public validatePermission(permission: any): permission is Permission {
    const validPermissions: Permission[] = ['screen', 'clipboard', 'automation', 'network', 'filesystem'];
    return validPermissions.includes(permission);
  }

  public validateTimestamp(timestamp: any): boolean {
    if (!(timestamp instanceof Date)) {
      return false;
    }

    const now = new Date();
    const diff = Math.abs(now.getTime() - timestamp.getTime());

    // Timestamp should be within 5 minutes of current time
    return diff < 5 * 60 * 1000;
  }

  public sanitizeMessage(message: PluginBusMessage): PluginBusMessage {
    // Create a sanitized copy
    const sanitized = { ...message };

    // Ensure timestamp is valid
    if (!this.validateTimestamp(sanitized.timestamp)) {
      sanitized.timestamp = new Date();
    }

    // Sanitize payload
    sanitized.payload = this.sanitizePayloadData(sanitized.payload);

    return sanitized;
  }

  private sanitizePayloadData(data: any): any {
    if (typeof data === 'string') {
      // Remove potentially dangerous content
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        if (typeof key === 'string' && !key.startsWith('_') && !key.includes('__')) {
          sanitized[key] = this.sanitizePayloadData(value);
        }
      }

      return sanitized;
    }

    return data;
  }
}