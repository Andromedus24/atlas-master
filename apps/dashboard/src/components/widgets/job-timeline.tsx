'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Image,
  Database,
  Zap
} from 'lucide-react';

interface Job {
  id: string;
  type: 'chat' | 'analyze' | 'generate' | 'automate' | 'ingest';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  title: string;
  description?: string;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
  plugin?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export function JobTimeline() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const mockJobs: Job[] = Array.from({ length: 50 }, (_, i) => {
      const types: Job['type'][] = ['chat', 'analyze', 'generate', 'automate', 'ingest'];
      const statuses: Job['status'][] = ['completed', 'running', 'failed', 'pending'];

      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const completedAt = status === 'completed' || status === 'failed'
        ? new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000) // Up to 1 hour later
        : undefined;

      return {
        id: `job-${i + 1}`,
        type: types[Math.floor(Math.random() * types.length)],
        status,
        title: `Job ${i + 1}`,
        description: `Description for job ${i + 1}`,
        progress: status === 'running' ? Math.floor(Math.random() * 100) : undefined,
        createdAt,
        completedAt,
        duration: completedAt ? Math.floor((completedAt.getTime() - createdAt.getTime()) / 1000) : undefined,
        plugin: `plugin-${Math.floor(Math.random() * 3) + 1}`,
        tags: [`tag-${Math.floor(Math.random() * 5) + 1}`],
        metadata: { source: 'mock' }
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setJobs(mockJobs);
    setFilteredJobs(mockJobs);
    setIsLoading(false);
  }, []);

  // Filter jobs based on search and filters
  useEffect(() => {
    let filtered = jobs;

    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(job => job.type === typeFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchQuery, statusFilter, typeFilter]);

  const getJobIcon = (type: Job['type']) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'analyze':
        return <Activity className="h-4 w-4" />;
      case 'generate':
        return <Image className="h-4 w-4" />;
      case 'automate':
        return <Zap className="h-4 w-4" />;
      case 'ingest':
        return <Database className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      failed: 'destructive',
      pending: 'outline',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading timeline...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Job Timeline
        </CardTitle>
        <CardDescription>
          Real-time view of all system jobs and operations
        </CardDescription>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="analyze">Analyze</SelectItem>
              <SelectItem value="generate">Generate</SelectItem>
              <SelectItem value="automate">Automate</SelectItem>
              <SelectItem value="ingest">Ingest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No jobs found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getJobIcon(job.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{job.title}</h4>
                    {getStatusIcon(job.status)}
                  </div>

                  {job.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {job.createdAt.toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.createdAt.toLocaleTimeString()}
                    </span>
                    {job.duration && (
                      <span>Duration: {formatDuration(job.duration)}</span>
                    )}
                    {job.progress !== undefined && (
                      <span>Progress: {job.progress}%</span>
                    )}
                  </div>

                  {job.tags && job.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {job.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {job.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {getStatusBadge(job.status)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}