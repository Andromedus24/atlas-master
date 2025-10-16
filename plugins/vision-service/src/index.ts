import { Plugin, PluginContext, PluginManifest } from '@free-cluely/shared';
import { VisionService } from './VisionService';

class VisionServicePlugin implements Plugin {
  public manifest: PluginManifest = {
    id: 'vision-service',
    name: 'Vision Service',
    version: '1.0.0',
    description: 'Computer vision and image analysis capabilities',
    author: 'Atlas Team',
    permissions: ['screen'],
    capabilities: ['image-analysis', 'ocr', 'object-detection'],
    entryPoint: './plugins/vision-service/index.js',
    dependencies: {
      'opencv': '^4.0.0'
    }
  };

  private visionService: VisionService | null = null;
  private context: PluginContext | null = null;

  public async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    try {
      this.visionService = new VisionService(context);
      await this.visionService.initialize();

      context.logger.info('Vision service plugin initialized');
    } catch (error) {
      context.logger.error('Failed to initialize vision service', error as Error);
      throw error;
    }
  }

  public async execute(method: string, payload: any): Promise<any> {
    if (!this.visionService || !this.context) {
      throw new Error('Plugin not initialized');
    }

    this.context.logger.debug(`Executing method: ${method}`, { payload });

    switch (method) {
      case 'analyze':
        return await this.visionService.analyzeImage(payload);
      case 'ocr':
        return await this.visionService.extractText(payload);
      case 'detectObjects':
        return await this.visionService.detectObjects(payload);
      case 'describe':
        return await this.visionService.describeImage(payload);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  public async destroy(): Promise<void> {
    if (this.visionService) {
      await this.visionService.destroy();
      this.visionService = null;
    }

    if (this.context) {
      this.context.logger.info('Vision service plugin destroyed');
      this.context = null;
    }
  }
}

export default new VisionServicePlugin();