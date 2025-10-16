import { Plugin, PluginContext, PluginManifest } from '@free-cluely/shared';
import { AutomationService } from './AutomationService';

class AutomationServicePlugin implements Plugin {
  public manifest: PluginManifest = {
    id: 'automation-service',
    name: 'Automation Service',
    version: '1.0.0',
    description: 'Browser automation and web scraping capabilities',
    author: 'Atlas Team',
    permissions: ['automation', 'network'],
    capabilities: ['web-automation', 'scraping', 'form-filling', 'screenshot'],
    entryPoint: './plugins/automation-service/index.js',
    dependencies: {
      'puppeteer': '^21.0.0'
    }
  };

  private automationService: AutomationService | null = null;
  private context: PluginContext | null = null;

  public async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    try {
      this.automationService = new AutomationService(context);
      await this.automationService.initialize();

      context.logger.info('Automation service plugin initialized');
    } catch (error) {
      context.logger.error('Failed to initialize automation service', error as Error);
      throw error;
    }
  }

  public async execute(method: string, payload: any): Promise<any> {
    if (!this.automationService || !this.context) {
      throw new Error('Plugin not initialized');
    }

    this.context.logger.debug(`Executing method: ${method}`, { payload });

    switch (method) {
      case 'navigate':
        return await this.automationService.navigate(payload);
      case 'click':
        return await this.automationService.click(payload);
      case 'type':
        return await this.automationService.type(payload);
      case 'screenshot':
        return await this.automationService.takeScreenshot(payload);
      case 'scrape':
        return await this.automationService.scrape(payload);
      case 'wait':
        return await this.automationService.wait(payload);
      case 'executeWorkflow':
        return await this.automationService.executeWorkflow(payload);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  public async destroy(): Promise<void> {
    if (this.automationService) {
      await this.automationService.destroy();
      this.automationService = null;
    }

    if (this.context) {
      this.context.logger.info('Automation service plugin destroyed');
      this.context = null;
    }
  }
}

export default new AutomationServicePlugin();