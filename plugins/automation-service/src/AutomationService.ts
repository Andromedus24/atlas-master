import { PluginContext } from '@free-cluely/shared';
import { ConfigManager } from '@free-cluely/config';

interface AutomationAction {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'scroll';
  selector?: string;
  url?: string;
  text?: string;
  duration?: number;
  position?: { x: number; y: number };
}

interface AutomationResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export class AutomationService {
  private context: PluginContext;
  private configManager: ConfigManager;
  private browser: any = null;
  private page: any = null;
  private isInitialized = false;

  constructor(context: PluginContext) {
    this.context = context;
    this.configManager = ConfigManager.getInstance();
  }

  public async initialize(): Promise<void> {
    this.context.logger.info('Initializing automation service');

    try {
      // Import Puppeteer dynamically
      const puppeteer = await import('puppeteer');

      // Launch browser in headless mode for security
      this.browser = await puppeteer.default.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();

      // Set reasonable timeouts
      await this.page.setDefaultNavigationTimeout(30000);
      await this.page.setDefaultTimeout(10000);

      this.isInitialized = true;

      this.context.logger.info('Automation service initialized with Puppeteer');
    } catch (error) {
      this.context.logger.error('Failed to initialize Puppeteer', error as Error);
      throw error;
    }
  }

  public async navigate(payload: { url: string; options?: { timeout?: number; waitUntil?: string } }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.info('Navigating to URL', { url: payload.url });

    try {
      // Validate domain access
      const domain = new URL(payload.url).hostname;
      const isAllowed = await this.validateDomainAccess(domain);

      if (!isAllowed) {
        throw new Error(`Domain ${domain} is not in the automation allowlist`);
      }

      const response = await this.page.goto(payload.url, {
        waitUntil: payload.options?.waitUntil || 'networkidle0',
        timeout: payload.options?.timeout || 30000
      });

      const duration = Date.now() - startTime;

      this.context.logger.info('Navigation completed', {
        url: payload.url,
        status: response.status(),
        duration
      });

      return {
        success: true,
        data: {
          url: response.url(),
          status: response.status(),
          title: await this.page.title()
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Navigation failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async click(payload: { selector: string; options?: { timeout?: number; count?: number } }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.debug('Clicking element', { selector: payload.selector });

    try {
      // Wait for element to be visible and clickable
      await this.page.waitForSelector(payload.selector, {
        visible: true,
        timeout: payload.options?.timeout || 10000
      });

      // Click the element
      await this.page.click(payload.selector, {
        clickCount: payload.options?.count || 1
      });

      const duration = Date.now() - startTime;

      this.context.logger.debug('Element clicked successfully', {
        selector: payload.selector,
        duration
      });

      return {
        success: true,
        data: { selector: payload.selector, action: 'click' },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Click failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async type(payload: { selector: string; text: string; options?: { delay?: number; clear?: boolean } }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.debug('Typing text', {
      selector: payload.selector,
      textLength: payload.text.length
    });

    try {
      // Wait for element to be visible
      await this.page.waitForSelector(payload.selector, {
        visible: true,
        timeout: 10000
      });

      // Clear existing text if requested
      if (payload.options?.clear !== false) {
        await this.page.click(payload.selector, { clickCount: 3 }); // Select all
        await this.page.keyboard.press('Backspace');
      }

      // Type the text
      await this.page.type(payload.selector, payload.text, {
        delay: payload.options?.delay || 100
      });

      const duration = Date.now() - startTime;

      this.context.logger.debug('Text typed successfully', {
        selector: payload.selector,
        duration
      });

      return {
        success: true,
        data: { selector: payload.selector, textLength: payload.text.length },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Typing failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async takeScreenshot(payload: { selector?: string; options?: { fullPage?: boolean; quality?: number } }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.info('Taking screenshot', {
      selector: payload.selector,
      fullPage: payload.options?.fullPage || false
    });

    try {
      let screenshot: Buffer;

      if (payload.selector) {
        // Screenshot specific element
        const element = await this.page.$(payload.selector);
        if (!element) {
          throw new Error(`Element not found: ${payload.selector}`);
        }

        screenshot = await element.screenshot({
          type: 'png',
          quality: payload.options?.quality || 90
        });
      } else {
        // Screenshot entire page or viewport
        screenshot = await this.page.screenshot({
          type: 'png',
          fullPage: payload.options?.fullPage || false,
          quality: payload.options?.quality || 90
        });
      }

      const duration = Date.now() - startTime;

      this.context.logger.info('Screenshot taken successfully', {
        size: screenshot.length,
        duration
      });

      return {
        success: true,
        data: {
          imageData: screenshot.toString('base64'),
          size: screenshot.length,
          timestamp: new Date().toISOString()
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Screenshot failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async scrape(payload: { selectors: Record<string, string>; options?: { timeout?: number } }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.info('Scraping page content', {
      selectorCount: Object.keys(payload.selectors).length
    });

    try {
      const scrapedData: Record<string, any> = {};

      for (const [key, selector] of Object.entries(payload.selectors)) {
        try {
          // Wait for element
          await this.page.waitForSelector(selector, {
            timeout: payload.options?.timeout || 5000
          });

          // Get element text or attribute
          const element = await this.page.$(selector);
          if (element) {
            const text = await this.page.evaluate(el => {
              // Try to get text content, fallback to innerHTML
              return el.textContent?.trim() || el.innerHTML?.trim() || '';
            }, element);

            scrapedData[key] = text;
          } else {
            scrapedData[key] = null;
          }
        } catch (error) {
          this.context.logger.warn(`Failed to scrape selector ${key}`, { error: (error as Error).message });
          scrapedData[key] = null;
        }
      }

      const duration = Date.now() - startTime;

      this.context.logger.info('Scraping completed', {
        scrapedFields: Object.keys(scrapedData).length,
        duration
      });

      return {
        success: true,
        data: scrapedData,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Scraping failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async wait(payload: { duration: number }): Promise<AutomationResult> {
    const startTime = Date.now();

    this.context.logger.debug('Waiting', { duration: payload.duration });

    try {
      await new Promise(resolve => setTimeout(resolve, payload.duration));

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: { waited: payload.duration },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Wait failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async executeWorkflow(payload: {
    actions: AutomationAction[];
    options?: {
      continueOnError?: boolean;
      timeout?: number;
    }
  }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.info('Executing workflow', {
      actionCount: payload.actions.length
    });

    const results: AutomationResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < payload.actions.length; i++) {
      const action = payload.actions[i];

      try {
        this.context.logger.debug(`Executing action ${i + 1}/${payload.actions.length}`, {
          type: action.type
        });

        let result: AutomationResult;

        switch (action.type) {
          case 'navigate':
            result = await this.navigate(action as any);
            break;
          case 'click':
            result = await this.click(action as any);
            break;
          case 'type':
            result = await this.type(action as any);
            break;
          case 'screenshot':
            result = await this.takeScreenshot(action as any);
            break;
          case 'wait':
            result = await this.wait(action as any);
            break;
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        results.push(result);

        if (!result.success && !payload.options?.continueOnError) {
          break;
        }
      } catch (error) {
        const errorMessage = `Action ${i + 1} failed: ${(error as Error).message}`;
        errors.push(errorMessage);

        if (!payload.options?.continueOnError) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    if (success) {
      this.context.logger.info('Workflow executed successfully', {
        actionCount: results.length,
        duration
      });
    } else {
      this.context.logger.warn('Workflow completed with errors', {
        successCount: results.filter(r => r.success).length,
        errorCount: errors.length,
        duration
      });
    }

    return {
      success,
      data: {
        results,
        errors,
        totalActions: payload.actions.length
      },
      duration
    };
  }

  private async validateDomainAccess(domain: string): Promise<boolean> {
    // This would typically be handled by the security manager
    // For now, we'll implement basic validation
    const allowlist = this.configManager.getConfigValue('permissions').automationAllowlist;

    if (allowlist.length === 0) {
      return true; // Allow all if no restrictions
    }

    return allowlist.includes(domain);
  }

  public async getPageInfo(): Promise<{ url: string; title: string; readyState: string }> {
    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    try {
      const info = await this.page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      }));

      return info;
    } catch (error) {
      throw new Error(`Failed to get page info: ${(error as Error).message}`);
    }
  }

  public async scroll(payload: { direction: 'up' | 'down' | 'top' | 'bottom'; amount?: number }): Promise<AutomationResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.page) {
      throw new Error('Automation service not initialized');
    }

    this.context.logger.debug('Scrolling page', { direction: payload.direction });

    try {
      switch (payload.direction) {
        case 'up':
          await this.page.evaluate((amount = 500) => {
            window.scrollBy(0, -amount);
          }, payload.amount);
          break;
        case 'down':
          await this.page.evaluate((amount = 500) => {
            window.scrollBy(0, amount);
          }, payload.amount);
          break;
        case 'top':
          await this.page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          break;
        case 'bottom':
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          break;
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: { direction: payload.direction, amount: payload.amount },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.context.logger.error('Scroll failed', error as Error);

      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  public async destroy(): Promise<void> {
    this.context.logger.info('Destroying automation service');

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isInitialized = false;

      this.context.logger.info('Automation service destroyed');
    } catch (error) {
      this.context.logger.error('Error during automation service cleanup', error as Error);
    }
  }
}