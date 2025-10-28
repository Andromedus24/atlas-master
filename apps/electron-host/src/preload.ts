import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: any) => ipcRenderer.invoke('config:update', updates),
    storeAPIKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke('config:storeAPIKey', provider, apiKey),
    getAPIKey: (provider: string) => ipcRenderer.invoke('config:getAPIKey', provider)
  },

  // Plugin management
  plugins: {
    getRegistered: () => ipcRenderer.invoke('plugins:getRegistered'),
    sendMessage: (message: any) => ipcRenderer.invoke('plugins:sendMessage', message)
  },

  // Data connectors
  connectors: {
    getRegistered: () => ipcRenderer.invoke('connectors:getRegistered'),
    register: (config: any) => ipcRenderer.invoke('connectors:register', config)
  },

  // AI Provider operations
  ai: {
    testProvider: (provider: string) => ipcRenderer.invoke('ai:testProvider', provider)
  },

  // Screen operations (with permission validation)
  screen: {
    capture: (options?: any) => ipcRenderer.invoke('screen:capture', options)
  },

  // Clipboard operations (with permission validation)
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (data: { text?: string; image?: string }) =>
      ipcRenderer.invoke('clipboard:write', data)
  },

  // Automation operations (domain-restricted)
  automation: {
    execute: (script: string, domain?: string) =>
      ipcRenderer.invoke('automation:execute', script, domain)
  },

  // File system operations (restricted to safe paths)
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content)
  },

  // Platform information
  platform: {
    getPlatform: () => process.platform,
    getVersion: () => process.version,
    isDev: () => process.env.NODE_ENV === 'development'
  },

  // Event listeners for real-time updates
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },

  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },

  onJobUpdate: (callback: (job: any) => void) => {
    ipcRenderer.on('job-update', (_, job) => callback(job));
    return () => ipcRenderer.removeListener('job-update', callback);
  },

  onConnectorUpdate: (callback: (connector: any) => void) => {
    ipcRenderer.on('connector-update', (_, connector) => callback(connector));
    return () => ipcRenderer.removeListener('connector-update', callback);
  },

  onPluginMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('plugin-message', (_, message) => callback(message));
    return () => ipcRenderer.removeListener('plugin-message', callback);
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      config: {
        get: () => Promise<any>;
        update: (updates: any) => Promise<void>;
        storeAPIKey: (provider: string, apiKey: string) => Promise<void>;
        getAPIKey: (provider: string) => Promise<string | null>;
      };
      plugins: {
        getRegistered: () => Promise<any[]>;
        sendMessage: (message: any) => Promise<any>;
      };
      connectors: {
        getRegistered: () => Promise<string[]>;
        register: (config: any) => Promise<any>;
      };
      ai: {
        testProvider: (provider: string) => Promise<{ success: boolean; error?: string }>;
      };
      screen: {
        capture: (options?: any) => Promise<any[]>;
      };
      clipboard: {
        read: () => Promise<{ text: string; image: string }>;
        write: (data: { text?: string; image?: string }) => Promise<{ success: boolean }>;
      };
      automation: {
        execute: (script: string, domain?: string) => Promise<{ success: boolean; result: string }>;
      };
      fs: {
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
      };
      platform: {
        getPlatform: () => string;
        getVersion: () => string;
        isDev: () => boolean;
      };
      onUpdateAvailable: (callback: () => void) => () => void;
      onUpdateDownloaded: (callback: () => void) => () => void;
      onJobUpdate: (callback: (job: any) => void) => () => void;
      onConnectorUpdate: (callback: (connector: any) => void) => () => void;
      onPluginMessage: (callback: (message: any) => void) => () => void;
    };
  }
}