'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bot,
  Database,
  Zap
} from 'lucide-react';

interface DashboardWidgetsProps {
  className?: string;
}

// Mock data - in a real app, this would come from APIs
const mockData = {
  jobStats: [
    { name: 'Mon', completed: 45, failed: 2 },
    { name: 'Tue', completed: 52, failed: 1 },
    { name: 'Wed', completed: 38, failed: 3 },
    { name: 'Thu', completed: 61, failed: 0 },
    { name: 'Fri', completed: 55, failed: 2 },
    { name: 'Sat', completed: 29, failed: 1 },
    { name: 'Sun', completed: 33, failed: 0 },
  ],
  pluginUsage: [
    { name: 'Vision Service', value: 35, color: '#8884d8' },
    { name: 'Automation', value: 25, color: '#82ca9d' },
    { name: 'Chat', value: 20, color: '#ffc658' },
    { name: 'Data Connectors', value: 20, color: '#ff7300' },
  ],
  systemMetrics: {
    cpuUsage: 45,
    memoryUsage: 67,
    storageUsed: 2.3,
    storageTotal: 10,
    activeJobs: 12,
    totalJobs: 1247,
    successRate: 94.2,
  }
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export function DashboardWidgets({ className }: DashboardWidgetsProps) {
  const { jobStats, pluginUsage, systemMetrics } = mockData;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Job Trends Chart */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Job Trends</span>
          </CardTitle>
          <CardDescription>
            Daily job completion and failure rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={jobStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                strokeWidth={2}
                name="Failed"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>CPU Usage</span>
              <span>{systemMetrics.cpuUsage}%</span>
            </div>
            <Progress value={systemMetrics.cpuUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Memory Usage</span>
              <span>{systemMetrics.memoryUsage}%</span>
            </div>
            <Progress value={systemMetrics.memoryUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Storage Used</span>
              <span>{systemMetrics.storageUsed}GB / {systemMetrics.storageTotal}GB</span>
            </div>
            <Progress value={(systemMetrics.storageUsed / systemMetrics.storageTotal) * 100} className="h-2" />
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <Badge variant={systemMetrics.successRate > 90 ? "default" : "destructive"}>
                {systemMetrics.successRate}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plugin Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Plugin Usage</span>
          </CardTitle>
          <CardDescription>
            Most active plugins this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pluginUsage}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pluginUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {pluginUsage.map((plugin, index) => (
              <div key={plugin.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate">{plugin.name}</span>
                </div>
                <span className="font-medium">{plugin.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Active Jobs</span>
            </div>
            <span className="font-bold">{systemMetrics.activeJobs}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Total Jobs</span>
            </div>
            <span className="font-bold">{systemMetrics.totalJobs.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-sm">Avg. Response</span>
            </div>
            <span className="font-bold">1.2s</span>
          </div>

          <div className="pt-2 border-t">
            <Button className="w-full" size="sm">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Performance Metrics</span>
          </CardTitle>
          <CardDescription>
            System performance and efficiency indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">1.2s</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">98.5%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">245ms</div>
              <div className="text-sm text-muted-foreground">Search P95</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">1.1s</div>
              <div className="text-sm text-muted-foreground">FCP</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}