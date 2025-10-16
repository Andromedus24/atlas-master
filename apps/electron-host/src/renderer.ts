import { ConfigManager } from '@free-cluely/config';
import { PluginBus } from '@free-cluely/plugin-bus';
import { AdapterManager } from '@free-cluely/adapters';

class ElectronRenderer {
  private configManager: ConfigManager;
  private pluginBus: PluginBus;
  private adapterManager: AdapterManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.pluginBus = PluginBus.getInstance();
    this.adapterManager = AdapterManager.getInstance();

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize core services in renderer process
      await this.initializeServices();

      // Setup IPC event listeners
      this.setupIPCListeners();

      // Update loading status
      this.updateStatus('Atlas initialized successfully');

      console.log('✅ Electron renderer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize renderer:', error);
      this.showError(`Initialization failed: ${(error as Error).message}`);
    }
  }

  private async initializeServices(): Promise<void> {
    // Services are already initialized in main process
    // Here we just ensure they're available in renderer

    // Check if configuration is loaded
    const config = this.configManager.getConfig();

    // Check if adapters are available
    const providers = this.adapterManager.getAvailableProviders();

    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }

    console.log(`🤖 AI providers available: ${providers.join(', ')}`);
  }

  private setupIPCListeners(): void {
    // Listen for main process events
    if (window.electron) {
      window.electron.on('screenshot-taken', () => {
        this.handleScreenshotTaken();
      });

      window.electron.on('show-settings', () => {
        this.showSettings();
      });

      window.electron.on('plugin-registered', (pluginId: string) => {
        console.log(`Plugin registered: ${pluginId}`);
      });

      window.electron.on('plugin-error', (error: string) => {
        console.error('Plugin error:', error);
      });
    }
  }

  private updateStatus(status: string): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  private showError(error: string): void {
    const errorElement = document.getElementById('error');
    const statusElement = document.getElementById('status');

    if (errorElement) {
      errorElement.textContent = `Error: ${error}`;
      errorElement.style.display = 'block';
    }

    if (statusElement) {
      statusElement.textContent = 'Failed to initialize';
    }
  }

  private handleScreenshotTaken(): void {
    this.updateStatus('Screenshot captured');
    console.log('Screenshot taken by user');
  }

  private showSettings(): void {
    this.updateStatus('Opening settings...');
    // In a real implementation, this would open the settings window
    console.log('Opening settings panel');
  }

  public async takeScreenshot(): Promise<void> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electron.screen.capture();

      if (result.success) {
        console.log('Screenshot captured:', result.data);
        this.updateStatus('Screenshot captured');
      } else {
        throw new Error(result.error || 'Screenshot failed');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      this.showError((error as Error).message);
    }
  }

  public async getClipboardContent(): Promise<void> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electron.clipboard.get();

      if (result.success) {
        console.log('Clipboard content:', result.data);
        this.updateStatus('Clipboard content retrieved');
      } else {
        throw new Error(result.error || 'Clipboard access failed');
      }
    } catch (error) {
      console.error('Clipboard access failed:', error);
      this.showError((error as Error).message);
    }
  }

  public async setClipboardContent(text: string): Promise<void> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electron.clipboard.set({ text });

      if (result.success) {
        console.log('Text copied to clipboard');
        this.updateStatus('Text copied to clipboard');
      } else {
        throw new Error(result.error || 'Clipboard write failed');
      }
    } catch (error) {
      console.error('Clipboard write failed:', error);
      this.showError((error as Error).message);
    }
  }

  public async chatWithAI(message: string): Promise<void> {
    try {
      const response = await window.electron.ai.chat({
        messages: [{
          role: 'user',
          content: message,
          timestamp: new Date()
        }],
        temperature: 0.7,
        maxTokens: 1024
      });

      console.log('AI response:', response.message.content);
      this.updateStatus('AI chat completed');
    } catch (error) {
      console.error('AI chat failed:', error);
      this.showError((error as Error).message);
    }
  }
}

// Initialize renderer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ElectronRenderer();
});

// Expose methods to global scope for debugging
declare global {
  interface Window {
    atlas?: ElectronRenderer;
  }
}

(window as any).atlas = new ElectronRenderer();