import { app, BrowserWindow, ipcMain, shell, screen, globalShortcut, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager } from '@free-cluely/config';
import { PluginBus, createPluginBus } from '@free-cluely/plugin-bus';
import { JobManager } from './job-manager';
import { SecurityManager } from './security-manager';
import { ApiServer } from './api-server';
import { SocketServer } from './socket-server';

class AtlasApp {
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private pluginBus: PluginBus;
  private jobManager: JobManager;
  private securityManager: SecurityManager;
  private apiServer: ApiServer;
  private socketServer: SocketServer;
  private isQuitting = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.pluginBus = createPluginBus(this.createLogger('PluginBus'));
    this.jobManager = new JobManager(this.createLogger('JobManager'));
    this.securityManager = new SecurityManager(this.createLogger('Security'));
    this.apiServer = new ApiServer(this.createLogger('ApiServer'));
    this.socketServer = new SocketServer(this.createLogger('SocketServer'));
  }

  async initialize(): Promise<void> {
    try {
      // Initialize configuration
      await this.configManager.initialize();

      // Initialize security
      await this.securityManager.initialize();

      // Initialize job system
      await this.jobManager.initialize();

      // Initialize API server
      await this.apiServer.initialize();

      // Initialize Socket.IO server
      await this.socketServer.initialize();

      // Load plugins
      await this.loadPlugins();

      // Setup IPC handlers
      this.setupIpcHandlers();

      // Setup global shortcuts
      this.setupGlobalShortcuts();

      console.log('Atlas application initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Atlas application:', error);
      app.quit();
    }
  }

  private async loadPlugins(): Promise<void> {
    const enabledPlugins = this.configManager.getEnabledPlugins();
    const trustedPaths = this.configManager.getTrustedPaths();

    for (const pluginId of enabledPlugins) {
      try {
        const pluginPath = path.join(__dirname, '..', '..', '..', 'plugins', pluginId);
        await this.pluginBus.loadPlugin(pluginPath, { trusted: trustedPaths.includes(pluginPath) });
      } catch (error) {
        console.error(`Failed to load plugin ${pluginId}:`, error);
      }
    }
  }

  private setupIpcHandlers(): void {
    // Plugin communication
    ipcMain.handle('plugin:send-message', async (event, message) => {
      try {
        return await this.pluginBus.sendMessage(message);
      } catch (error) {
        console.error('IPC plugin message error:', error);
        throw error;
      }
    });

    // Job management
    ipcMain.handle('job:create', async (event, jobData) => {
      return await this.jobManager.createJob(jobData);
    });

    ipcMain.handle('job:get', async (event, jobId) => {
      return await this.jobManager.getJob(jobId);
    });

    ipcMain.handle('job:list', async (event, filters) => {
      return await this.jobManager.listJobs(filters);
    });

    // Configuration
    ipcMain.handle('config:get', () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:update', async (event, updates) => {
      return await this.configManager.updateConfig(updates);
    });

    // Security
    ipcMain.handle('security:request-permission', async (event, request) => {
      return await this.securityManager.requestPermission(request);
    });

    ipcMain.handle('security:check-permission', async (event, permission, resource) => {
      return await this.securityManager.checkPermission(permission, resource);
    });

    // Screen capture
    ipcMain.handle('screen:capture', async (event, options) => {
      return await this.captureScreen(options);
    });

    // Clipboard operations
    ipcMain.handle('clipboard:read', async () => {
      const { clipboard } = require('electron');
      return clipboard.readText();
    });

    ipcMain.handle('clipboard:write', async (event, text) => {
      const { clipboard } = require('electron');
      clipboard.writeText(text);
    });

    // File system operations
    ipcMain.handle('fs:read-file', async (event, filePath) => {
      return await this.securityManager.readFile(filePath);
    });

    ipcMain.handle('fs:write-file', async (event, filePath, content) => {
      return await this.securityManager.writeFile(filePath, content);
    });

    // Automation
    ipcMain.handle('automation:run', async (event, automationData) => {
      return await this.runAutomation(automationData);
    });
  }

  private setupGlobalShortcuts(): void {
    // Register global shortcuts for quick actions
    globalShortcut.register('CommandOrControl+Shift+A', () => {
      this.showMainWindow();
    });

    globalShortcut.register('CommandOrControl+Shift+C', async () => {
      // Quick screen capture
      if (this.mainWindow) {
        this.mainWindow.webContents.send('shortcut:screen-capture');
      }
    });
  }

  private async captureScreen(options: any = {}): Promise<string> {
    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];

    if (!this.mainWindow) {
      throw new Error('Main window not available');
    }

    // Create a hidden window for capturing
    const captureWindow = new BrowserWindow({
      width: options.width || primaryDisplay.size.width,
      height: options.height || primaryDisplay.size.height,
      x: options.x || 0,
      y: options.y || 0,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      // Load a transparent page for capturing
      await captureWindow.loadURL(`data:text/html,<html><body style="margin:0;padding:0;overflow:hidden;"></body></html>`);

      // Capture the screen area
      const image = await captureWindow.webContents.capturePage();
      const buffer = image.toPNG();

      return `data:image/png;base64,${buffer.toString('base64')}`;
    } finally {
      captureWindow.close();
    }
  }

  private async runAutomation(automationData: any): Promise<any> {
    // Check if automation is allowed
    if (!this.securityManager.checkPermission('automation', automationData.target)) {
      throw new Error('Automation permission denied');
    }

    // This would integrate with a puppeteer-like automation system
    // For now, we'll return a placeholder response
    return {
      success: true,
      message: 'Automation executed successfully'
    };
  }

  private createMainWindow(): BrowserWindow {
    const config = this.configManager.getConfig();

    const window = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false, // Required for some native APIs
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false,
      titleBarStyle: 'default',
    });

    // Load the dashboard URL
    const dashboardUrl = config.dashboard.port === 3000
      ? 'http://localhost:3000'
      : `http://localhost:${config.dashboard.port}`;

    window.loadURL(dashboardUrl);

    // Show window when ready to prevent visual flash
    window.once('ready-to-show', () => {
      window.show();

      // Focus on macOS
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    });

    // Handle external links
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Handle window closed
    window.on('closed', () => {
      this.mainWindow = null;
    });

    return window;
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      this.mainWindow = this.createMainWindow();
    }
  }

  private createLogger(name: string) {
    return {
      info: (message: string, meta?: any) => console.log(`[${name}] ${message}`, meta || ''),
      warn: (message: string, meta?: any) => console.warn(`[${name}] ${message}`, meta || ''),
      error: (message: string, error?: Error, meta?: any) => console.error(`[${name}] ${message}`, error || '', meta || ''),
      debug: (message: string, meta?: any) => console.debug(`[${name}] ${message}`, meta || ''),
    };
  }

  async start(): Promise<void> {
    await this.initialize();

    app.whenReady().then(() => {
      this.showMainWindow();

      // macOS: re-create window when dock icon is clicked
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.showMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      // Don't quit on macOS when all windows are closed
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', (event) => {
      if (!this.isQuitting) {
        this.isQuitting = true;

        // Cleanup
        this.pluginBus.removeAllListeners();
        this.jobManager.destroy();
        this.configManager.destroy();
      }
    });
  }
}

// Handle app events
app.on('ready', async () => {
  const atlasApp = new AtlasApp();
  await atlasApp.start();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});