import { contextBridge, ipcRenderer } from 'electron';
import { AIChatRequest, AIChatResponse, AIVisionRequest, AIVisionResponse } from '@free-cluely/shared';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Configuration
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: any) => ipcRenderer.invoke('config:update', updates)
  },

  // Plugins
  plugins: {
    getRegistered: () => ipcRenderer.invoke('plugins:getRegistered'),
    register: (pluginId: string) => ipcRenderer.invoke('plugins:register', pluginId)
  },

  // Screen capture
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture')
  },

  // Clipboard
  clipboard: {
    get: () => ipcRenderer.invoke('clipboard:get'),
    set: (data: { text?: string; image?: string }) => ipcRenderer.invoke('clipboard:set', data)
  },

  // Job management
  jobs: {
    get: (filters?: any) => ipcRenderer.invoke('jobs:get', filters),
    create: (jobData: any) => ipcRenderer.invoke('jobs:create', jobData)
  },

  // AI providers
  ai: {
    providers: () => ipcRenderer.invoke('ai:providers'),
    chat: (request: AIChatRequest): Promise<AIChatResponse> => ipcRenderer.invoke('ai:chat', request),
    vision: (request: AIVisionRequest): Promise<AIVisionResponse> => ipcRenderer.invoke('ai:vision', request)
  },

  // App information
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    showItemInFolder: (path: string) => ipcRenderer.invoke('app:showItemInFolder', path)
  },

  // Platform information
  platform: process.platform,

  // Event listeners for renderer process
  on: (channel: string, callback: (...args: any[]) => void) => {
    // Whitelist of allowed channels
    const validChannels = [
      'screenshot-taken',
      'show-settings',
      'plugin-registered',
      'plugin-error',
      'job-completed',
      'job-failed'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove event listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// TypeScript declarations for window.electron
declare global {
  interface Window {
    electron: {
      config: {
        get: () => Promise<any>;
        update: (updates: any) => Promise<any>;
      };
      plugins: {
        getRegistered: () => Promise<string[]>;
        register: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
      };
      screen: {
        capture: () => Promise<{ success: boolean; data?: any; error?: string }>;
      };
      clipboard: {
        get: () => Promise<{ success: boolean; data?: any; error?: string }>;
        set: (data: { text?: string; image?: string }) => Promise<{ success: boolean; error?: string }>;
      };
      jobs: {
        get: (filters?: any) => Promise<any[]>;
        create: (jobData: any) => Promise<any>;
      };
      ai: {
        providers: () => Promise<any>;
        chat: (request: AIChatRequest) => Promise<AIChatResponse>;
        vision: (request: AIVisionRequest) => Promise<AIVisionResponse>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPath: (name: string) => Promise<string>;
        showItemInFolder: (path: string) => Promise<void>;
      };
      platform: string;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}