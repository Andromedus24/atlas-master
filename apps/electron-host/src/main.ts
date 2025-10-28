import { app, BrowserWindow, ipcMain, Menu, shell, dialog, screen } from 'electron';
import { join } from 'path';
import { ConfigManager } from '@free-cluely/config';
import { PluginBus } from '@free-cluely/plugin-bus';
import { AdapterFactory } from '@free-cluely/adapters';
import { DataConnectorManager } from '@free-cluely/data-connectors';
import { promises as fs } from 'fs';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager | null = null;
let pluginBus: PluginBus | null = null;
let dataConnectorManager: DataConnectorManager | null = null;

// Security: Domain allowlist for automation
const ALLOWED_DOMAINS = [
  'github.com',
  'stackoverflow.com',
  'docs.microsoft.com',
  'developer.mozilla.org'
];

async function createWindow(): Promise<void> {
  // Create the browser window with security settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: join(__dirname, 'preload.js'),
      // Security: Disable new window creation
      nativeWindowOpen: false,
      // Security: Restrict web security for development
      webSecurity: process.env.NODE_ENV === 'development' ? false : true,
      // Security: Disable dev tools in production
      devTools: process.env.NODE_ENV === 'development'
    },
    icon: join(__dirname, '../../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false // Don't show until ready-to-show
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize core services
  await initializeServices();
}

async function initializeServices(): Promise<void> {
  try {
    // Initialize configuration manager
    configManager = new ConfigManager({
      configPath: join(app.getPath('userData'), 'config.json'),
      keychainService: 'atlas-keys',
      keychainAccount: 'api-keys'
    });
    await configManager.initialize();

    // Initialize plugin bus
    pluginBus = new PluginBus({
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000
    });

    // Initialize data connector manager
    dataConnectorManager = new DataConnectorManager();

    console.log('Core services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    // Show error dialog to user
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize Atlas. Please check your configuration and try again.'
    );
  }
}

// IPC handlers for secure communication
function setupIPCHandlers(): void {
  if (!mainWindow) return;

  // Configuration management
  ipcMain.handle('config:get', async () => {
    return configManager?.getConfig();
  });

  ipcMain.handle('config:update', async (_, updates: any) => {
    return configManager?.updateConfig(updates);
  });

  ipcMain.handle('config:storeAPIKey', async (_, provider: string, apiKey: string) => {
    return configManager?.storeAPIKey(provider, apiKey);
  });

  ipcMain.handle('config:getAPIKey', async (_, provider: string) => {
    return configManager?.getAPIKey(provider);
  });

  // Plugin management
  ipcMain.handle('plugins:getRegistered', () => {
    return pluginBus?.getRegisteredPlugins();
  });

  ipcMain.handle('plugins:sendMessage', async (_, message: any) => {
    return pluginBus?.sendMessage(message);
  });

  // Data connectors
  ipcMain.handle('connectors:getRegistered', () => {
    return dataConnectorManager?.getRegisteredConnectors();
  });

  ipcMain.handle('connectors:register', async (_, config: any) => {
    const connector = pluginBus ? await pluginBus.sendMessage({
      id: 'create-connector',
      type: 'request',
      plugin: 'data-connectors',
      method: 'createConnector',
      payload: config
    }) : null;

    if (connector && dataConnectorManager) {
      await dataConnectorManager.registerConnector(connector);
    }

    return connector;
  });

  // AI Provider testing
  ipcMain.handle('ai:testProvider', async (_, provider: string) => {
    try {
      const config = configManager?.getAIProviderConfig(provider);
      if (!config) return { success: false, error: 'Provider not configured' };

      const adapter = AdapterFactory.createAdapter(config as any);
      const isHealthy = await adapter.isHealthy();

      return { success: isHealthy, provider };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Screen capture (with permission check)
  ipcMain.handle('screen:capture', async (_, options: any) => {
    const config = configManager?.getConfig();
    if (!config?.permissions.allowlist?.includes('screen')) {
      throw new Error('Screen capture permission not granted');
    }

    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: options?.thumbnailSize || { width: 800, height: 600 }
    });

    return sources.map((source: any) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  });

  // Clipboard operations (with permission check)
  ipcMain.handle('clipboard:read', async () => {
    const config = configManager?.getConfig();
    if (!config?.permissions.allowlist?.includes('clipboard')) {
      throw new Error('Clipboard permission not granted');
    }

    const { clipboard } = require('electron');
    return {
      text: clipboard.readText(),
      image: clipboard.readImage().toDataURL()
    };
  });

  ipcMain.handle('clipboard:write', async (_, data: { text?: string; image?: string }) => {
    const config = configManager?.getConfig();
    if (!config?.permissions.allowlist?.includes('clipboard')) {
      throw new Error('Clipboard permission not granted');
    }

    const { clipboard } = require('electron');

    if (data.text) clipboard.writeText(data.text);
    if (data.image) {
      const image = require('electron').nativeImage.createFromDataURL(data.image);
      clipboard.writeImage(image);
    }

    return { success: true };
  });

  // Automation (domain-restricted)
  ipcMain.handle('automation:execute', async (_, script: string, domain?: string) => {
    const config = configManager?.getConfig();

    // Check domain allowlist
    if (domain && !ALLOWED_DOMAINS.some(allowed => domain.includes(allowed))) {
      throw new Error(`Domain ${domain} is not in the automation allowlist`);
    }

    // Check automation permission
    if (!config?.permissions.allowlist?.includes('automation')) {
      throw new Error('Automation permission not granted');
    }

    // In a real implementation, this would use Puppeteer or similar
    console.log('Executing automation script:', script);

    return {
      success: true,
      result: 'Automation executed successfully'
    };
  });

  // File system operations (restricted)
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    const config = configManager?.getConfig();

    // Basic path traversal protection
    const normalizedPath = require('path').resolve(filePath);
    const safePath = config?.storage.dataPath || app.getPath('userData');

    if (!normalizedPath.startsWith(safePath)) {
      throw new Error('Access denied: File path outside allowed directory');
    }

    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    const config = configManager?.getConfig();

    // Basic path traversal protection
    const normalizedPath = require('path').resolve(filePath);
    const safePath = config?.storage.dataPath || app.getPath('userData');

    if (!normalizedPath.startsWith(safePath)) {
      throw new Error('Access denied: File path outside allowed directory');
    }

    try {
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

// App event handlers
app.whenReady().then(async () => {
  // Set up IPC handlers before creating window
  setupIPCHandlers();

  await createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Handle app termination
app.on('before-quit', async (event) => {
  // Clean up services before quitting
  if (pluginBus) {
    await pluginBus.destroy();
  }

  if (dataConnectorManager) {
    await dataConnectorManager.destroy();
  }
});

// Security: Handle certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.env.NODE_ENV === 'development' && url.includes('localhost')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to show a dialog or log to a service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to show a dialog or log to a service
});