// Plugin communication bus
export { PluginBus } from './PluginBus';

// Supporting classes
export { MessageValidator } from './MessageValidator';
export { PermissionManager } from './PermissionManager';
export { PluginRegistry } from './PluginRegistry';

// Re-export types for convenience
export type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginBusMessage,
  PluginBusResponse
} from '@free-cluely/shared';