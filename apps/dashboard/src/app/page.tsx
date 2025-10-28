'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Database,
  Image as ImageIcon,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  Plus,
  RefreshCw,
  Settings
} from 'lucide-react';
import { JobTimeline } from '@/components/widgets/job-timeline';
import { KPICard } from '@/components/widgets/kpi-card';
import { DataConnectorWidget } from '@/components/widgets/data-connector-widget';
import { ImageGenerationWidget } from '@/components/widgets/image-generation-widget';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  dataConnectors: number;
  activeConnectors: number;
  aiProviders: number;
  healthyProviders: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    dataConnectors: 0,
    activeConnectors: 0,
    aiProviders: 0,
    healthyProviders: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In a real app, this would fetch from your API
        const mockStats: DashboardStats = {
          totalJobs: Math.floor(Math.random() * 1000) + 500,
          activeJobs: Math.floor(Math.random() * 20) + 5,
          completedJobs: Math.floor(Math.random() * 800) + 400,
          failedJobs: Math.floor(Math.random() * 50) + 10,
          dataConnectors: Math.floor(Math.random() * 10) + 3,
          activeConnectors: Math.floor(Math.random() * 8) + 2,
          aiProviders: 4,
          healthyProviders: Math.floor(Math.random() * 4) + 3
        };

        setStats(mockStats);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Update stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    // Trigger refresh logic here
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="h-8 w-8 text-muted-foreground" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atlas Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your AI-powered assistant
            {lastUpdated && (
              <span className="ml-2 text-sm">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <KPICard
            title="Total Jobs"
            value={stats.totalJobs.toLocaleString()}
            change={`+${Math.floor(Math.random() * 20) + 5}%`}
            icon={Activity}
            trend="up"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <KPICard
            title="Active Jobs"
            value={stats.activeJobs.toString()}
            change={`${stats.activeJobs > 10 ? '+' : ''}${Math.floor(Math.random() * 10) - 5}%`}
            icon={Zap}
            trend={stats.activeJobs > 10 ? "up" : "down"}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <KPICard
            title="Data Connectors"
            value={`${stats.activeConnectors}/${stats.dataConnectors}`}
            change={`${Math.floor(Math.random() * 40) + 60}% healthy`}
            icon={Database}
            trend="up"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <KPICard
            title="AI Providers"
            value={`${stats.healthyProviders}/${stats.aiProviders}`}
            change="Online"
            icon={MessageSquare}
            trend="up"
          />
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Recent Activity */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest jobs and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`h-2 w-2 rounded-full ${
                        i % 3 === 0 ? 'bg-green-500' :
                        i % 3 === 1 ? 'bg-blue-500' : 'bg-orange-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {i % 3 === 0 ? 'Chat completion' :
                           i % 3 === 1 ? 'Data ingestion' : 'Image generation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 60) + 1} minutes ago
                        </p>
                      </div>
                      <Badge variant={
                        i % 3 === 0 ? 'default' :
                        i % 3 === 1 ? 'secondary' : 'outline'
                      }>
                        {i % 3 === 0 ? 'Success' :
                         i % 3 === 1 ? 'Running' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-medium">{Math.floor(Math.random() * 30) + 10}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">{Math.floor(Math.random() * 40) + 20}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Disk Usage</span>
                  <span className="text-sm font-medium">{Math.floor(Math.random() * 20) + 5}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network</span>
                  <Badge variant="outline" className="text-green-600">Online</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <JobTimeline />
        </TabsContent>

        <TabsContent value="data">
          <DataConnectorWidget />
        </TabsContent>

        <TabsContent value="generate">
          <ImageGenerationWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}