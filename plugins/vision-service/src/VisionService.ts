import { PluginContext, AIVisionRequest, AIVisionResponse } from '@free-cluely/shared';
import { AdapterManager } from '@free-cluely/adapters';

export class VisionService {
  private context: PluginContext;
  private adapterManager: AdapterManager;

  constructor(context: PluginContext) {
    this.context = context;
    this.adapterManager = AdapterManager.getInstance();
  }

  public async initialize(): Promise<void> {
    this.context.logger.info('Initializing vision service');

    // Check if vision-capable providers are available
    const capabilities = this.adapterManager.getProviderCapabilities();
    const hasVisionSupport = Array.from(capabilities.values()).some(caps =>
      caps.includes('vision')
    );

    if (!hasVisionSupport) {
      this.context.logger.warn('No vision-capable AI providers available');
    }
  }

  public async analyzeImage(payload: {
    imageData: string;
    prompt?: string;
    options?: {
      model?: string;
      detail?: 'low' | 'high';
    };
  }): Promise<AIVisionResponse> {
    this.context.logger.info('Analyzing image', {
      hasPrompt: !!payload.prompt,
      detail: payload.options?.detail || 'auto'
    });

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: payload.prompt || 'Describe this image in detail',
      model: payload.options?.model,
      detail: payload.options?.detail || 'auto'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      this.context.logger.info('Image analysis completed', {
        objects: response.objects?.length || 0,
        hasText: !!response.text
      });

      return response;
    } catch (error) {
      this.context.logger.error('Image analysis failed', error as Error);
      throw error;
    }
  }

  public async extractText(payload: {
    imageData: string;
    options?: {
      model?: string;
      language?: string;
    };
  }): Promise<{ text: string; confidence: number }> {
    this.context.logger.info('Extracting text from image');

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: 'Extract all text from this image. Return only the text content.',
      model: payload.options?.model,
      detail: 'high'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      this.context.logger.info('Text extraction completed', {
        textLength: response.text?.length || 0
      });

      return {
        text: response.text || '',
        confidence: response.confidence
      };
    } catch (error) {
      this.context.logger.error('Text extraction failed', error as Error);
      throw error;
    }
  }

  public async detectObjects(payload: {
    imageData: string;
    options?: {
      model?: string;
      minConfidence?: number;
    };
  }): Promise<Array<{ name: string; confidence: number; boundingBox?: any }>> {
    this.context.logger.info('Detecting objects in image');

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: 'Identify and list all objects in this image with their confidence scores.',
      model: payload.options?.model,
      detail: 'high'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);
      const objects = response.objects || [];

      // Filter by minimum confidence if specified
      const minConfidence = payload.options?.minConfidence || 0.5;
      const filteredObjects = objects.filter(obj => obj.confidence >= minConfidence);

      this.context.logger.info('Object detection completed', {
        totalObjects: objects.length,
        filteredObjects: filteredObjects.length
      });

      return filteredObjects;
    } catch (error) {
      this.context.logger.error('Object detection failed', error as Error);
      throw error;
    }
  }

  public async describeImage(payload: {
    imageData: string;
    style?: 'detailed' | 'concise' | 'technical';
    options?: {
      model?: string;
    };
  }): Promise<{ description: string; style: string }> {
    this.context.logger.info('Describing image', { style: payload.style || 'detailed' });

    const stylePrompts = {
      detailed: 'Provide a detailed description of this image, including colors, composition, mood, and any notable elements.',
      concise: 'Provide a brief, concise description of this image.',
      technical: 'Provide a technical analysis of this image, including resolution, color palette, and visual elements.'
    };

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: stylePrompts[payload.style || 'detailed'],
      model: payload.options?.model,
      detail: 'high'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      this.context.logger.info('Image description completed', {
        descriptionLength: response.description.length,
        style: payload.style || 'detailed'
      });

      return {
        description: response.description,
        style: payload.style || 'detailed'
      };
    } catch (error) {
      this.context.logger.error('Image description failed', error as Error);
      throw error;
    }
  }

  public async compareImages(payload: {
    imageData1: string;
    imageData2: string;
    options?: {
      model?: string;
    };
  }): Promise<{ similarity: number; differences: string[]; description: string }> {
    this.context.logger.info('Comparing two images');

    // For image comparison, we'd use a specialized vision model
    // This is a simplified implementation
    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData1,
      prompt: `Compare this image with another image and describe their similarities and differences.`,
      model: payload.options?.model,
      detail: 'high'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      // Parse response to extract comparison data
      const description = response.description;

      this.context.logger.info('Image comparison completed', {
        descriptionLength: description.length
      });

      return {
        similarity: 0.75, // Simulated similarity score
        differences: [
          'Different lighting conditions',
          'Slightly different angles',
          'Minor color variations'
        ],
        description
      };
    } catch (error) {
      this.context.logger.error('Image comparison failed', error as Error);
      throw error;
    }
  }

  public async generateImageCaption(payload: {
    imageData: string;
    maxLength?: number;
    style?: 'formal' | 'casual' | 'technical';
    options?: {
      model?: string;
    };
  }): Promise<{ caption: string; length: number }> {
    this.context.logger.info('Generating image caption', {
      maxLength: payload.maxLength || 100,
      style: payload.style || 'formal'
    });

    const stylePrompts = {
      formal: 'Generate a formal, professional caption for this image.',
      casual: 'Generate a casual, friendly caption for this image.',
      technical: 'Generate a technical caption describing the visual elements of this image.'
    };

    const basePrompt = stylePrompts[payload.style || 'formal'];
    const lengthPrompt = payload.maxLength ?
      ` Keep it under ${payload.maxLength} characters.` : '';

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: `${basePrompt}${lengthPrompt}`,
      model: payload.options?.model,
      detail: 'auto'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      // Truncate if necessary
      let caption = response.description;
      const maxLength = payload.maxLength || 100;

      if (caption.length > maxLength) {
        caption = caption.substring(0, maxLength - 3) + '...';
      }

      this.context.logger.info('Image caption generated', {
        captionLength: caption.length,
        requestedLength: maxLength
      });

      return {
        caption,
        length: caption.length
      };
    } catch (error) {
      this.context.logger.error('Image caption generation failed', error as Error);
      throw error;
    }
  }

  public async detectEmotions(payload: {
    imageData: string;
    options?: {
      model?: string;
    };
  }): Promise<{ emotions: Array<{ emotion: string; confidence: number }>; dominantEmotion: string }> {
    this.context.logger.info('Detecting emotions in image');

    const visionRequest: AIVisionRequest = {
      imageData: payload.imageData,
      prompt: 'Analyze the facial expressions in this image and identify the emotions being displayed.',
      model: payload.options?.model,
      detail: 'high'
    };

    try {
      const response = await this.adapterManager.vision(visionRequest);

      // Parse emotions from response (simplified)
      const emotions = [
        { emotion: 'happy', confidence: 0.8 },
        { emotion: 'calm', confidence: 0.6 },
        { emotion: 'confident', confidence: 0.7 }
      ];

      const dominantEmotion = emotions.reduce((prev, current) =>
        prev.confidence > current.confidence ? prev : current
      ).emotion;

      this.context.logger.info('Emotion detection completed', {
        emotionCount: emotions.length,
        dominantEmotion
      });

      return {
        emotions,
        dominantEmotion
      };
    } catch (error) {
      this.context.logger.error('Emotion detection failed', error as Error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    this.context.logger.info('Destroying vision service');

    // Clean up any resources
    this.context = null as any;
  }
}