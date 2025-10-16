import { contextBridge, ipcRenderer } from 'electron';
import { PluginMessage, PluginResponse, Job, Config } from '@free-cluely/shared';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Plugin system
  pluginSendMessage: (message: PluginMessage): Promise<PluginResponse> =>
    ipcRenderer.invoke('plugin:send-message', message),

  // Job management
  createJob: (jobData: Partial<Job>): Promise<Job> =>
    ipcRenderer.invoke('job:create', jobData),

  getJob: (jobId: string): Promise<Job | null> =>
    ipcRenderer.invoke('job:get', jobId),

  listJobs: (filters?: any): Promise<Job[]> =>
    ipcRenderer.invoke('job:list', filters),

  // Configuration
  getConfig: (): Promise<Config> =>
    ipcRenderer.invoke('config:get'),

  updateConfig: (updates: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('config:update', updates),

  // Security
  requestPermission: (request: any): Promise<boolean> =>
    ipcRenderer.invoke('security:request-permission', request),

  checkPermission: (permission: string, resource?: string): Promise<boolean> =>
    ipcRenderer.invoke('security:check-permission', permission, resource),

  // Screen capture
  captureScreen: (options?: any): Promise<string> =>
    ipcRenderer.invoke('screen:capture', options),

  // Clipboard operations
  readClipboard: (): Promise<string> =>
    ipcRenderer.invoke('clipboard:read'),

  writeClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipboard:write', text),

  // File system operations
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:write-file', filePath, content),

  // Automation
  runAutomation: (automationData: any): Promise<any> =>
    ipcRenderer.invoke('automation:run', automationData),

  // Event listeners
  onConfigUpdate: (callback: (config: Config) => void) => {
    ipcRenderer.on('config-updated', (_, config) => callback(config));
    return () => ipcRenderer.removeAllListeners('config-updated');
  },

  onJobUpdate: (callback: (job: Job) => void) => {
    ipcRenderer.on('job-updated', (_, job) => callback(job));
    return () => ipcRenderer.removeAllListeners('job-updated');
  },

  onPluginEvent: (callback: (event: any) => void) => {
    ipcRenderer.on('plugin-event', (_, event) => callback(event));
    return () => ipcRenderer.removeAllListeners('plugin-event');
  },

  // Platform information
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      // Plugin system
      pluginSendMessage: (message: PluginMessage) => Promise<PluginResponse>;

      // Job management
      createJob: (jobData: Partial<Job>) => Promise<Job>;
      getJob: (jobId: string) => Promise<Job | null>;
      listJobs: (filters?: any) => Promise<Job[]>;

      // Configuration
      getConfig: () => Promise<Config>;
      updateConfig: (updates: Partial<Config>) => Promise<Config>;

      // Security
      requestPermission: (request: any) => Promise<boolean>;
      checkPermission: (permission: string, resource?: string) => Promise<boolean>;

      // Screen capture
      captureScreen: (options?: any) => Promise<string>;

      // Clipboard operations
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<void>;

      // File system operations
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<void>;

      // Automation
      runAutomation: (automationData: any) => Promise<any>;

      // Event listeners
      onConfigUpdate: (callback: (config: Config) => void) => () => void;
      onJobUpdate: (callback: (job: Job) => void) => () => void;
      onPluginEvent: (callback: (event: any) => void) => () => void;

      // Platform information
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}