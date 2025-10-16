import { Job, JobStatus, JobType, generateId } from '@free-cluely/shared';
import { ConfigManager } from '@free-cluely/config';
import { Database } from 'better-sqlite3';

export class JobManager {
  private db: Database | null = null;
  private configManager: ConfigManager;
  private activeJobs: Map<string, NodeJS.Timeout> = new Map();
  private jobQueue: Job[] = [];

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize SQLite database
      await this.initializeDatabase();

      // Load pending jobs from database
      await this.loadPendingJobs();

      console.log('💼 Job manager initialized');
    } catch (error) {
      console.error('Failed to initialize job manager:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    const config = this.configManager.getConfig();
    const dbPath = config.database?.path || './data/atlas.db';

    // Ensure directory exists
    const fs = require('fs');
    const path = require('path');
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    const Database = require('better-sqlite3');
    this.db = new Database(dbPath);

    // Create tables
    this.createTables();

    console.log(`📊 Database initialized: ${dbPath}`);
  }

  private createTables(): void {
    if (!this.db) return;

    // Jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        user_id TEXT,
        session_id TEXT,
        plugin_id TEXT,
        ai_provider TEXT,
        model TEXT,
        tokens_input INTEGER,
        tokens_output INTEGER,
        tokens_total INTEGER,
        cost_amount REAL,
        cost_currency TEXT
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_plugin_id ON jobs(plugin_id);
    `);
  }

  private async loadPendingJobs(): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM jobs
        WHERE status IN ('pending', 'running')
        ORDER BY created_at ASC
      `);

      const jobs = stmt.all() as any[];

      for (const jobData of jobs) {
        const job = this.deserializeJob(jobData);

        if (job.status === 'running') {
          // Check if job has exceeded timeout
          const maxDuration = this.configManager.getConfigValue('security').maxJobDuration;
          const elapsed = Date.now() - (job.startedAt?.getTime() || job.createdAt.getTime());

          if (elapsed > maxDuration) {
            await this.failJob(job.id, 'Job timeout exceeded');
          } else {
            // Restart the job
            this.startJob(job);
          }
        } else if (job.status === 'pending') {
          this.jobQueue.push(job);
        }
      }

      console.log(`📋 Loaded ${jobs.length} pending/running jobs`);
    } catch (error) {
      console.error('Failed to load pending jobs:', error);
    }
  }

  public async createJob(jobData: Partial<Job>): Promise<Job> {
    const job: Job = {
      id: generateId(),
      type: jobData.type || 'chat',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      payload: jobData.payload || {},
      userId: jobData.userId,
      sessionId: jobData.sessionId,
      pluginId: jobData.pluginId,
      aiProvider: jobData.aiProvider,
      model: jobData.model,
      ...jobData
    };

    try {
      await this.saveJobToDatabase(job);

      // Add to queue if not running immediately
      if (job.type !== 'chat') { // Chat jobs run immediately
        this.jobQueue.push(job);
        this.processQueue();
      } else {
        // Start chat job immediately
        this.startJob(job);
      }

      return job;
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    }
  }

  public getJobs(filters?: {
    status?: JobStatus;
    type?: JobType;
    limit?: number;
    offset?: number;
  }): Job[] {
    if (!this.db) return [];

    try {
      let query = 'SELECT * FROM jobs WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters?.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      query += ' ORDER BY created_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);

        if (filters?.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = this.db.prepare(query);
      const jobs = stmt.all(...params) as any[];

      return jobs.map(jobData => this.deserializeJob(jobData));
    } catch (error) {
      console.error('Failed to get jobs:', error);
      return [];
    }
  }

  private async processQueue(): Promise<void> {
    if (this.jobQueue.length === 0) return;

    // Process jobs one at a time
    const job = this.jobQueue.shift();
    if (job) {
      await this.startJob(job);
    }
  }

  private async startJob(job: Job): Promise<void> {
    try {
      // Update job status to running
      job.status = 'running';
      job.startedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);

      // Set timeout for job
      const timeout = setTimeout(async () => {
        await this.failJob(job.id, 'Job timeout exceeded');
        this.activeJobs.delete(job.id);
      }, this.configManager.getConfigValue('security').maxJobDuration);

      this.activeJobs.set(job.id, timeout);

      // Execute job based on type
      await this.executeJob(job);

    } catch (error) {
      console.error(`Failed to start job ${job.id}:`, error);
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    try {
      switch (job.type) {
        case 'chat':
          await this.executeChatJob(job);
          break;
        case 'analyze':
          await this.executeAnalysisJob(job);
          break;
        case 'generate':
          await this.executeGenerationJob(job);
          break;
        case 'automate':
          await this.executeAutomationJob(job);
          break;
        case 'ingest':
          await this.executeIngestionJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error(`Job execution failed for ${job.id}:`, error);
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeChatJob(job: Job): Promise<void> {
    // Import AdapterManager dynamically to avoid circular dependency
    const { AdapterManager } = require('@free-cluely/adapters');
    const adapterManager = AdapterManager.getInstance();

    try {
      const response = await adapterManager.chat(job.payload);

      job.status = 'completed';
      job.result = response;
      job.tokens = response.usage;
      job.cost = response.cost;
      job.completedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);
      this.cleanupJob(job.id);

      console.log(`✅ Chat job completed: ${job.id}`);
    } catch (error) {
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeAnalysisJob(job: Job): Promise<void> {
    // Similar to chat job but for vision analysis
    const { AdapterManager } = require('@free-cluely/adapters');
    const adapterManager = AdapterManager.getInstance();

    try {
      const response = await adapterManager.vision(job.payload);

      job.status = 'completed';
      job.result = response;
      job.completedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);
      this.cleanupJob(job.id);

      console.log(`✅ Analysis job completed: ${job.id}`);
    } catch (error) {
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeGenerationJob(job: Job): Promise<void> {
    // Image generation job
    const { AdapterManager } = require('@free-cluely/adapters');
    const adapterManager = AdapterManager.getInstance();

    try {
      const response = await adapterManager.generateImage(job.payload);

      job.status = 'completed';
      job.result = response;
      job.completedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);
      this.cleanupJob(job.id);

      console.log(`✅ Generation job completed: ${job.id}`);
    } catch (error) {
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeAutomationJob(job: Job): Promise<void> {
    // Automation job - would integrate with plugin system
    try {
      // Simulate automation work
      await new Promise(resolve => setTimeout(resolve, 2000));

      job.status = 'completed';
      job.result = { success: true, message: 'Automation completed' };
      job.completedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);
      this.cleanupJob(job.id);

      console.log(`✅ Automation job completed: ${job.id}`);
    } catch (error) {
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async executeIngestionJob(job: Job): Promise<void> {
    // Data ingestion job
    try {
      // Simulate data processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      job.status = 'completed';
      job.result = { success: true, records: 100 };
      job.completedAt = new Date();
      job.updatedAt = new Date();

      await this.saveJobToDatabase(job);
      this.cleanupJob(job.id);

      console.log(`✅ Ingestion job completed: ${job.id}`);
    } catch (error) {
      await this.failJob(job.id, (error as Error).message);
    }
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    const job = await this.getJobById(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = {
      message: errorMessage,
      stack: new Error().stack,
      code: 'JOB_EXECUTION_ERROR'
    };
    job.updatedAt = new Date();

    await this.saveJobToDatabase(job);
    this.cleanupJob(jobId);

    console.error(`❌ Job failed: ${jobId} - ${errorMessage}`);
  }

  private async completeJob(jobId: string, result: any): Promise<void> {
    const job = await this.getJobById(jobId);
    if (!job) return;

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    job.updatedAt = new Date();

    await this.saveJobToDatabase(job);
    this.cleanupJob(jobId);

    console.log(`✅ Job completed: ${jobId}`);
  }

  private async saveJobToDatabase(job: Job): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO jobs (
          id, type, status, payload, result, error, created_at, updated_at,
          started_at, completed_at, user_id, session_id, plugin_id,
          ai_provider, model, tokens_input, tokens_output, tokens_total,
          cost_amount, cost_currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        job.id,
        job.type,
        job.status,
        JSON.stringify(job.payload),
        JSON.stringify(job.result),
        JSON.stringify(job.error),
        job.createdAt.toISOString(),
        job.updatedAt.toISOString(),
        job.startedAt?.toISOString(),
        job.completedAt?.toISOString(),
        job.userId,
        job.sessionId,
        job.pluginId,
        job.aiProvider,
        job.model,
        job.tokens?.input,
        job.tokens?.output,
        job.tokens?.total,
        job.cost?.amount,
        job.cost?.currency
      );
    } catch (error) {
      console.error('Failed to save job to database:', error);
    }
  }

  private async getJobById(jobId: string): Promise<Job | null> {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
      const jobData = stmt.get(jobId) as any;

      return jobData ? this.deserializeJob(jobData) : null;
    } catch (error) {
      console.error('Failed to get job by ID:', error);
      return null;
    }
  }

  private deserializeJob(jobData: any): Job {
    return {
      ...jobData,
      createdAt: new Date(jobData.created_at),
      updatedAt: new Date(jobData.updated_at),
      startedAt: jobData.started_at ? new Date(jobData.started_at) : undefined,
      completedAt: jobData.completed_at ? new Date(jobData.completed_at) : undefined,
      payload: JSON.parse(jobData.payload || '{}'),
      result: jobData.result ? JSON.parse(jobData.result) : undefined,
      error: jobData.error ? JSON.parse(jobData.error) : undefined,
      tokens: jobData.tokens_input ? {
        input: jobData.tokens_input,
        output: jobData.tokens_output,
        total: jobData.tokens_total
      } : undefined,
      cost: jobData.cost_amount ? {
        amount: jobData.cost_amount,
        currency: jobData.cost_currency
      } : undefined
    };
  }

  private cleanupJob(jobId: string): void {
    // Clear timeout
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
    }

    // Process next job in queue
    this.processQueue();
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJobById(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    await this.failJob(jobId, 'Job cancelled by user');
    return true;
  }

  public getJobStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    if (!this.db) {
      return { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    }

    try {
      const stats = this.db.prepare(`
        SELECT status, COUNT(*) as count FROM jobs GROUP BY status
      `).all() as Array<{ status: string; count: number }>;

      const result = { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };

      for (const stat of stats) {
        result.total += stat.count;
        switch (stat.status) {
          case 'pending': result.pending = stat.count; break;
          case 'running': result.running = stat.count; break;
          case 'completed': result.completed = stat.count; break;
          case 'failed': result.failed = stat.count; break;
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to get job stats:', error);
      return { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down job manager...');

    // Cancel all running jobs
    for (const [jobId, timeout] of this.activeJobs) {
      clearTimeout(timeout);
      await this.failJob(jobId, 'Application shutdown');
    }

    this.activeJobs.clear();
    this.jobQueue.length = 0;

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('✅ Job manager shutdown complete');
  }
}