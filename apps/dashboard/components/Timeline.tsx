'use client';

import { useState, useEffect } from 'react';
import { Job, JobStatus, JobType } from '@free-cluely/shared';

interface TimelineFilters {
  status?: JobStatus;
  type?: JobType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export function Timeline() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const jobsPerPage = 20;

  useEffect(() => {
    loadJobs();
  }, [filters, currentPage]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      // Simulate API call to load jobs
      // In a real implementation, this would call a backend API
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock jobs for demonstration
      const mockJobs: Job[] = generateMockJobs(50);

      // Apply filters
      let filteredJobs = mockJobs;

      if (filters.status) {
        filteredJobs = filteredJobs.filter(job => job.status === filters.status);
      }

      if (filters.type) {
        filteredJobs = filteredJobs.filter(job => job.type === filters.type);
      }

      if (filters.dateRange) {
        filteredJobs = filteredJobs.filter(job => {
          const jobDate = new Date(job.createdAt);
          return jobDate >= filters.dateRange!.start && jobDate <= filters.dateRange!.end;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredJobs = filteredJobs.filter(job =>
          job.id.toLowerCase().includes(searchLower) ||
          job.type.toLowerCase().includes(searchLower) ||
          (job.pluginId && job.pluginId.toLowerCase().includes(searchLower))
        );
      }

      // Apply pagination
      const startIndex = (currentPage - 1) * jobsPerPage;
      const endIndex = startIndex + jobsPerPage;
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      setJobs(paginatedJobs);
      setTotalPages(Math.ceil(filteredJobs.length / jobsPerPage));
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockJobs = (count: number): Job[] => {
    const types: JobType[] = ['chat', 'analyze', 'generate', 'automate', 'ingest'];
    const statuses: JobStatus[] = ['completed', 'failed', 'running', 'pending'];
    const plugins = ['vision-service', 'automation-service', 'chat-service', 'data-service'];

    return Array.from({ length: count }, (_, i) => ({
      id: `job_${Date.now()}_${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      updatedAt: new Date(),
      startedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      completedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 60 * 60 * 1000) : undefined,
      userId: 'user_123',
      sessionId: 'session_456',
      pluginId: Math.random() > 0.2 ? plugins[Math.floor(Math.random() * plugins.length)] : undefined,
      aiProvider: Math.random() > 0.5 ? 'anthropic' : 'google',
      model: Math.random() > 0.5 ? 'claude-3-sonnet-20240229' : 'gemini-pro',
      tokens: {
        input: Math.floor(Math.random() * 1000) + 100,
        output: Math.floor(Math.random() * 500) + 50,
        total: Math.floor(Math.random() * 1500) + 150
      },
      cost: {
        amount: Math.random() * 0.1,
        currency: 'USD'
      },
      payload: { description: `Job ${i + 1} payload` },
      result: Math.random() > 0.2 ? { success: true, data: `Result for job ${i + 1}` } : undefined,
      error: Math.random() > 0.8 ? {
        message: 'Simulated error',
        stack: 'Error stack trace',
        code: 'SIMULATED_ERROR'
      } : undefined
    }));
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return 'N/A';
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: e.target.value as JobStatus || undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                type: e.target.value as JobType || undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              <option value="chat">Chat</option>
              <option value="analyze">Analyze</option>
              <option value="generate">Generate</option>
              <option value="automate">Automate</option>
              <option value="ingest">Ingest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                search: e.target.value || undefined
              }))}
              placeholder="Search jobs..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Actions
            </label>
            <button
              onClick={() => {
                setFilters({});
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Job Timeline
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Total: {jobs.length}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📋</div>
              <p>No jobs found matching your criteria</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {job.type}
                      </span>
                      {job.pluginId && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                          {job.pluginId}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">ID:</span> {job.id.slice(-8)}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(job.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {formatDuration(job.startedAt, job.completedAt)}
                      </div>
                      {job.tokens && (
                        <div>
                          <span className="font-medium">Tokens:</span> {job.tokens.total}
                        </div>
                      )}
                      {job.cost && (
                        <div>
                          <span className="font-medium">Cost:</span> ${job.cost.amount.toFixed(6)}
                        </div>
                      )}
                      {job.aiProvider && (
                        <div>
                          <span className="font-medium">Provider:</span> {job.aiProvider}
                        </div>
                      )}
                    </div>

                    {job.error && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error:</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{job.error.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Previous
              </button>

              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}