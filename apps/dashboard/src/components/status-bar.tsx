'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Activity,
  Zap
} from 'lucide-react';

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  plugins: 'healthy' | 'degraded' | 'down';
  network: 'online' | 'offline';
  lastUpdated: Date;
}

export function StatusBar() {
  const [status, setStatus] = useState<SystemStatus>({
    api: 'healthy',
    database: 'healthy',
    plugins: 'healthy',
    network: 'online',
    lastUpdated: new Date()
  });

  // Simulate real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        lastUpdated: new Date(),
        // Simulate occasional status changes
        api: Math.random() > 0.95 ? 'degraded' : prev.api,
        database: Math.random() > 0.98 ? 'down' : prev.database,
        plugins: Math.random() > 0.97 ? 'degraded' : prev.plugins,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (statusValue: 'healthy' | 'degraded' | 'down') => {
    switch (statusValue) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusColor = (statusValue: 'healthy' | 'degraded' | 'down') => {
    switch (statusValue) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'down':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const overallStatus = (() => {
    if (status.database === 'down' || status.api === 'down') return 'down';
    if (status.database === 'degraded' || status.api === 'degraded' || status.plugins === 'degraded') return 'degraded';
    return 'healthy';
  })();

  return (
    <div className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">System Status:</span>
              <Badge className={getStatusColor(overallStatus)}>
                {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.api)}
                      <span className="text-xs">API</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>AI Provider APIs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.database)}
                      <span className="text-xs">DB</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Database Connection</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.plugins)}
                      <span className="text-xs">Plugins</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Plugin System</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center gap-1">
                {status.network === 'online' ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs">{status.network === 'online' ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated: {status.lastUpdated.toLocaleTimeString()}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Zap className="h-3 w-3 mr-1" />
              Live
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}