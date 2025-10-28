'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Database,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';

interface DataConnector {
  id: string;
  name: string;
  type: 'url' | 'api' | 'csv';
  url?: string;
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  schedule?: string;
  recordCount?: number;
}

export function DataConnectorWidget() {
  const [connectors, setConnectors] = useState<DataConnector[]>([
    {
      id: '1',
      name: 'News API',
      type: 'api',
      url: 'https://newsapi.org/v2/top-headlines',
      status: 'active',
      lastSync: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      schedule: '0 */2 * * *', // Every 2 hours
      recordCount: 245
    },
    {
      id: '2',
      name: 'Weather Data',
      type: 'url',
      url: 'https://api.weatherapi.com/v1/current.json',
      status: 'active',
      lastSync: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      schedule: '0 * * * *', // Every hour
      recordCount: 89
    },
    {
      id: '3',
      name: 'CSV Import',
      type: 'csv',
      url: 'https://example.com/data.csv',
      status: 'error',
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      schedule: '0 9 * * *', // Daily at 9 AM
      recordCount: 0
    }
  ]);

  const [isAddingConnector, setIsAddingConnector] = useState(false);
  const [newConnector, setNewConnector] = useState({
    name: '',
    type: 'url' as DataConnector['type'],
    url: ''
  });

  const handleAddConnector = () => {
    if (!newConnector.name.trim() || !newConnector.url.trim()) return;

    const connector: DataConnector = {
      id: Date.now().toString(),
      name: newConnector.name,
      type: newConnector.type,
      url: newConnector.url,
      status: 'inactive'
    };

    setConnectors(prev => [...prev, connector]);
    setNewConnector({ name: '', type: 'url', url: '' });
    setIsAddingConnector(false);
  };

  const handleToggleConnector = (id: string) => {
    setConnectors(prev =>
      prev.map(connector =>
        connector.id === id
          ? { ...connector, status: connector.status === 'active' ? 'inactive' : 'active' }
          : connector
      )
    );
  };

  const handleDeleteConnector = (id: string) => {
    setConnectors(prev => prev.filter(connector => connector.id !== id));
  };

  const handleSyncConnector = async (id: string) => {
    setConnectors(prev =>
      prev.map(connector =>
        connector.id === id
          ? { ...connector, status: 'active' as const, lastSync: new Date() }
          : connector
      )
    );

    // Simulate sync operation
    setTimeout(() => {
      setConnectors(prev =>
        prev.map(connector =>
          connector.id === id
            ? {
                ...connector,
                status: 'active' as const,
                recordCount: (connector.recordCount || 0) + Math.floor(Math.random() * 50) + 10
              }
            : connector
        )
      );
    }, 2000);
  };

  const getStatusIcon = (status: DataConnector['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DataConnector['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add New Connector */}
      {isAddingConnector ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Data Connector</CardTitle>
            <CardDescription>Configure a new data source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newConnector.name}
                  onChange={(e) => setNewConnector(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Connector name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newConnector.type}
                  onValueChange={(value: DataConnector['type']) =>
                    setNewConnector(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newConnector.url}
                onChange={(e) => setNewConnector(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/api/data"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddConnector}>Add Connector</Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingConnector(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Data Connectors</h2>
            <p className="text-muted-foreground">
              Manage your data ingestion sources ({connectors.length} total)
            </p>
          </div>
          <Button onClick={() => setIsAddingConnector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connector
          </Button>
        </div>
      )}

      {/* Connectors List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector, index) => (
          <motion.div
            key={connector.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{connector.name}</CardTitle>
                  </div>
                  {getStatusIcon(connector.status)}
                </div>
                <CardDescription className="text-sm">
                  {connector.type.toUpperCase()} • {connector.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(connector.status)}
                  {connector.recordCount !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {connector.recordCount} records
                    </span>
                  )}
                </div>

                {connector.lastSync && (
                  <div className="text-xs text-muted-foreground">
                    Last sync: {connector.lastSync.toLocaleString()}
                  </div>
                )}

                {connector.schedule && (
                  <div className="text-xs text-muted-foreground">
                    Schedule: Every {connector.schedule}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={connector.status === 'active' ? 'secondary' : 'default'}
                    onClick={() => handleToggleConnector(connector.id)}
                    className="flex-1"
                  >
                    {connector.status === 'active' ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncConnector(connector.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteConnector(connector.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {connectors.length === 0 && !isAddingConnector && (
        <Card>
          <CardContent className="text-center py-8">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Connectors</h3>
            <p className="text-muted-foreground mb-4">
              Start ingesting data by adding your first connector
            </p>
            <Button onClick={() => setIsAddingConnector(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Connector
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}