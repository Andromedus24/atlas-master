import { app, BrowserWindow, Menu, ipcMain, dialog, shell, screen, globalShortcut, Tray, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from '@free-cluely/config';
import { PluginBus } from '@free-cluely/plugin-bus';
import { AdapterManager } from '@free-cluely/adapters';
import { JobManager } from './JobManager';
import { SecurityManager } from './SecurityManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class AtlasApplication {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private configManager: ConfigManager;
  private pluginBus: PluginBus;
  private adapterManager: AdapterManager;
  private jobManager: JobManager;
  private securityManager: SecurityManager;
  private isQuitting = false;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.pluginBus = PluginBus.getInstance();
    this.adapterManager = AdapterManager.getInstance();
    this.jobManager = new JobManager();
    this.securityManager = new SecurityManager();
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Atlas...');

      // Initialize core services
      await this.initializeCoreServices();

      // Setup application menu
      this.setupApplicationMenu();

      // Setup IPC handlers
      this.setupIPCHandlers();

      // Setup global shortcuts
      this.setupGlobalShortcuts();

      // Create system tray
      this.createTray();

      console.log('✅ Atlas initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Atlas:', error);
      app.quit();
    }
  }

  private async initializeCoreServices(): Promise<void> {
    // Initialize configuration
    const config = this.configManager.getConfig();
    console.log('📋 Configuration loaded');

    // Initialize AI adapters
    await this.adapterManager.reloadConfiguration();
    console.log('🤖 AI adapters initialized');

    // Initialize plugin bus
    // Note: Plugins will be loaded dynamically
    console.log('🔌 Plugin bus initialized');

    // Initialize job manager
    await this.jobManager.initialize();
    console.log('💼 Job manager initialized');

    // Initialize security manager
    await this.securityManager.initialize();
    console.log('🔒 Security manager initialized');
  }

  private setupApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Atlas',
        submenu: [
          {
            label: 'About Atlas',
            click: () => {
              dialog.showMessageBox(this.mainWindow!, {
                type: 'info',
                title: 'About Atlas',
                message: 'Atlas - AI Desktop Assistant',
                detail: `Version ${app.getVersion()}\nYour intelligent desktop companion powered by AI.`
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.send('show-settings');
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              this.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          { type: 'separator' },
          {
            label: 'Always on Top',
            type: 'checkbox',
            checked: false,
            click: (item) => {
              if (this.mainWindow) {
                this.mainWindow.setAlwaysOnTop(item.checked);
              }
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://github.com/free-cluely/atlas/wiki');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/free-cluely/atlas/issues');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPCHandlers(): void {
    // Configuration IPC
    ipcMain.handle('config:get', () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:update', (event, updates) => {
      this.configManager.updateConfig(updates);
      return this.configManager.getConfig();
    });

    // Plugin IPC
    ipcMain.handle('plugins:getRegistered', () => {
      return this.pluginBus.getRegisteredPlugins();
    });

    ipcMain.handle('plugins:register', async (event, pluginId) => {
      try {
        // In a real implementation, this would load the plugin from disk
        // For now, we'll simulate plugin loading
        await this.pluginBus.registerPlugin({
          manifest: {
            id: pluginId,
            name: pluginId,
            version: '1.0.0',
            description: 'Dynamically loaded plugin',
            author: 'Atlas',
            permissions: ['screen'],
            capabilities: ['test'],
            entryPoint: `./plugins/${pluginId}/index.js`
          },
          initialize: async () => {},
          execute: async () => ({}),
          destroy: async () => {}
        } as any);

        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Screen capture IPC
    ipcMain.handle('screen:capture', async (event) => {
      try {
        const permission = await this.securityManager.requestPermission('screen', 'Screen capture requested');
        if (!permission) {
          throw new Error('Screen capture permission denied');
        }

        if (!this.mainWindow) {
          throw new Error('Main window not available');
        }

        const display = screen.getPrimaryDisplay();
        const { width, height } = display.bounds;

        // In a real implementation, this would capture the screen
        // For now, we'll return mock data
        return {
          success: true,
          data: {
            width,
            height,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Clipboard IPC
    ipcMain.handle('clipboard:get', async () => {
      try {
        const permission = await this.securityManager.requestPermission('clipboard', 'Clipboard access requested');
        if (!permission) {
          throw new Error('Clipboard permission denied');
        }

        const { clipboard } = require('electron');
        return {
          success: true,
          data: {
            text: clipboard.readText(),
            image: clipboard.readImage().toDataURL()
          }
        };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('clipboard:set', async (event, data) => {
      try {
        const permission = await this.securityManager.requestPermission('clipboard', 'Clipboard write requested');
        if (!permission) {
          throw new Error('Clipboard permission denied');
        }

        const { clipboard } = require('electron');
        if (data.text) {
          clipboard.writeText(data.text);
        }
        if (data.image) {
          clipboard.writeImage(require('electron').nativeImage.createFromDataURL(data.image));
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Job management IPC
    ipcMain.handle('jobs:get', (event, filters) => {
      return this.jobManager.getJobs(filters);
    });

    ipcMain.handle('jobs:create', (event, jobData) => {
      return this.jobManager.createJob(jobData);
    });

    // AI provider IPC
    ipcMain.handle('ai:providers', () => {
      return {
        available: this.adapterManager.getAvailableProviders(),
        current: this.adapterManager.getCurrentProvider(),
        capabilities: this.adapterManager.getProviderCapabilities()
      };
    });

    ipcMain.handle('ai:chat', async (event, request) => {
      try {
        return await this.adapterManager.chat(request);
      } catch (error) {
        throw new Error(`AI chat failed: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('ai:vision', async (event, request) => {
      try {
        return await this.adapterManager.vision(request);
      } catch (error) {
        throw new Error(`AI vision failed: ${(error as Error).message}`);
      }
    });
  }

  private setupGlobalShortcuts(): void {
    // Register global shortcuts
    globalShortcut.register('CommandOrControl+Shift+A', () => {
      this.showMainWindow();
    });

    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.takeScreenshot();
    });

    // Unregister shortcuts when app is quitting
    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  private createTray(): void {
    try {
      const iconPath = path.join(__dirname, '../assets/tray-icon.png');

      // Use a default icon if the custom one doesn't exist
      let icon;
      if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
      } else {
        icon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
      }

      this.tray = new Tray(icon.resize({ width: 16, height: 16 }));

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Atlas',
          click: () => this.showMainWindow()
        },
        {
          label: 'Settings',
          click: () => {
            this.showMainWindow();
            if (this.mainWindow) {
              this.mainWindow.webContents.send('show-settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit Atlas',
          click: () => this.quit()
        }
      ]);

      this.tray.setToolTip('Atlas - AI Desktop Assistant');
      this.tray.setContextMenu(contextMenu);

      this.tray.on('click', () => {
        this.showMainWindow();
      });
    } catch (error) {
      console.error('Failed to create system tray:', error);
    }
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      this.createMainWindow();
    }
  }

  private createMainWindow(): void {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.min(1400, width * 0.9),
      height: Math.min(900, height * 0.9),
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      titleBarStyle: 'default',
      show: false
    });

    // Load the renderer process
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('minimize', (event) => {
      event.preventDefault();
      if (this.mainWindow) {
        this.mainWindow.hide();
      }
    });

    // Security: Prevent new window creation
    this.mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });
  }

  private takeScreenshot(): void {
    // In a real implementation, this would trigger screen capture
    // For now, we'll just show a notification
    if (this.mainWindow) {
      this.mainWindow.webContents.send('screenshot-taken');
    }
  }

  private quit(): void {
    this.isQuitting = true;
    app.quit();
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Atlas...');

    try {
      // Shutdown services in reverse order
      await this.jobManager.shutdown();
      await this.pluginBus.shutdown();
      await this.adapterManager.reloadConfiguration();

      console.log('✅ Atlas shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// App event handlers
let atlasApp: AtlasApplication | null = null;

app.whenReady().then(async () => {
  atlasApp = new AtlasApplication();
  await atlasApp.initialize();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      atlasApp?.createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  if (!atlasApp?.['isQuitting']) {
    event.preventDefault();
    await atlasApp?.shutdown();
    app.exit(0);
  }
});

// Handle app being killed
process.on('SIGINT', async () => {
  await atlasApp?.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await atlasApp?.shutdown();
  process.exit(0);
});