'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Job, JobStatus, JobType } from '@free-cluely/shared';
import { formatDistanceToNow } from 'date-fns';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
  Tag,
  User,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  jobs: Job[];
  compact?: boolean;
  onJobClick?: (job: Job) => void;
}

const statusIcons = {
  pending: Clock,
  running: Play,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  pending: 'text-yellow-500',
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  cancelled: 'text-gray-500',
};

const typeColors = {
  chat: 'bg-blue-100 text-blue-800',
  analyze: 'bg-purple-100 text-purple-800',
  generate: 'bg-green-100 text-green-800',
  automate: 'bg-orange-100 text-orange-800',
  ingest: 'bg-cyan-100 text-cyan-800',
  export: 'bg-pink-100 text-pink-800',
  import: 'bg-indigo-100 text-indigo-800',
};

export function TimelineView({ jobs, compact = false, onJobClick }: TimelineViewProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No jobs to display</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", compact ? "h-96" : "h-[600px]")}>
      <div className="space-y-4">
        {jobs.map((job) => {
          const StatusIcon = statusIcons[job.status];
          const statusColor = statusColors[job.status];
          const typeColor = typeColors[job.type] || 'bg-gray-100 text-gray-800';

          return (
            <Card
              key={job.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                compact && "p-3"
              )}
              onClick={() => onJobClick?.(job)}
            >
              <CardContent className={cn("p-4", compact && "p-3")}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <StatusIcon className={cn("w-4 h-4", statusColor)} />
                      <h3 className={cn("font-medium truncate", compact ? "text-sm" : "text-base")}>
                        {job.title}
                      </h3>
                      <Badge variant="secondary" className={cn("text-xs", typeColor)}>
                        {job.type}
                      </Badge>
                    </div>

                    {!compact && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {job.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDistanceToNow(job.createdAt, { addSuffix: true })}</span>
                      </div>

                      {job.progress !== undefined && (
                        <div className="flex items-center space-x-1">
                          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span>{job.progress}%</span>
                        </div>
                      )}

                      {job.userId && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{job.userId}</span>
                        </div>
                      )}

                      {job.pluginId && (
                        <div className="flex items-center space-x-1">
                          <Bot className="w-3 h-3" />
                          <span>{job.pluginId}</span>
                        </div>
                      )}
                    </div>

                    {job.tags && job.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {job.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <Badge
                      variant={job.status === 'completed' ? 'default' :
                              job.status === 'failed' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {job.status}
                    </Badge>

                    {!compact && (
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {job.error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {job.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}