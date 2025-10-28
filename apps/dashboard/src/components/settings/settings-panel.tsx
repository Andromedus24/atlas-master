'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Shield,
  Database,
  Palette,
  Key,
  Plugin,
  Save,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useConfig } from '@/components/providers/config-provider';
import { Config } from '@free-cluely/shared';

export function SettingsPanel() {
  const { config, loading, error, refreshConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState<Config | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleConfigChange = (path: string, value: any) => {
    if (!localConfig) return;

    const keys = path.split('.');
    const newConfig = { ...localConfig };

    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setLocalConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localConfig || !hasChanges) return;

    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localConfig),
      });

      if (response.ok) {
        await refreshConfig();
        setHasChanges(false);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !localConfig) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load configuration</p>
            <Button onClick={refreshConfig} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Configure your Atlas assistant preferences and security settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ai">AI Provider</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* AI Provider Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>AI Provider Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your preferred AI provider and model settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select
                    value={localConfig.ai.provider}
                    onValueChange={(value) => handleConfigChange('ai.provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      <SelectItem value="openai">OpenAI GPT</SelectItem>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={localConfig.ai.model}
                    onValueChange={(value) => handleConfigChange('ai.model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={localConfig.ai.apiKey}
                      onChange={(e) => handleConfigChange('ai.apiKey', e.target.value)}
                      placeholder="Enter your API key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your API key is stored securely and never transmitted to external servers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={localConfig.ai.maxTokens || 4096}
                    onChange={(e) => handleConfigChange('ai.maxTokens', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={localConfig.ai.temperature || 0.7}
                    onChange={(e) => handleConfigChange('ai.temperature', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Settings */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Permission Settings</span>
              </CardTitle>
              <CardDescription>
                Control what Atlas can access on your system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">System Access</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Screen Capture</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow capturing screenshots
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.screen}
                      onCheckedChange={(checked) => handleConfigChange('permissions.screen', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Clipboard Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Read and write to clipboard
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.clipboard}
                      onCheckedChange={(checked) => handleConfigChange('permissions.clipboard', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automation</Label>
                      <p className="text-sm text-muted-foreground">
                        Control browser and applications
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.automation}
                      onCheckedChange={(checked) => handleConfigChange('permissions.automation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Network Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Make HTTP requests
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.network}
                      onCheckedChange={(checked) => handleConfigChange('permissions.network', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Media Access</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Camera</Label>
                      <p className="text-sm text-muted-foreground">
                        Access camera for video calls
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.camera}
                      onCheckedChange={(checked) => handleConfigChange('permissions.camera', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Microphone</Label>
                      <p className="text-sm text-muted-foreground">
                        Access microphone for voice input
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.microphone}
                      onCheckedChange={(checked) => handleConfigChange('permissions.microphone', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>File System</Label>
                      <p className="text-sm text-muted-foreground">
                        Read and write files
                      </p>
                    </div>
                    <Switch
                      checked={localConfig.permissions.filesystem}
                      onCheckedChange={(checked) => handleConfigChange('permissions.filesystem', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="allowedDomains">Allowed Domains (for automation)</Label>
                <Textarea
                  id="allowedDomains"
                  placeholder="github.com,stackoverflow.com,your-domain.com"
                  value={localConfig.permissions.allowedDomains?.join(', ') || ''}
                  onChange={(e) => handleConfigChange('permissions.allowedDomains', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of domains Atlas can interact with
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security and audit settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all security-related events
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.security.enableAuditLog}
                    onCheckedChange={(checked) => handleConfigChange('security.enableAuditLog', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requireApproval">Require Approval For</Label>
                  <Textarea
                    id="requireApproval"
                    placeholder="automation,filesystem"
                    value={localConfig.security.requireApproval?.join(', ') || ''}
                    onChange={(e) => handleConfigChange('security.requireApproval', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of permissions that require user approval
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxJobHistory">Max Job History</Label>
                  <Input
                    id="maxJobHistory"
                    type="number"
                    value={localConfig.security.maxJobHistory || 10000}
                    onChange={(e) => handleConfigChange('security.maxJobHistory', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of jobs to keep in history
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plugin Settings */}
        <TabsContent value="plugins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plugin className="w-5 h-5" />
                <span>Plugin Management</span>
              </CardTitle>
              <CardDescription>
                Manage enabled plugins and trusted paths
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="enabledPlugins">Enabled Plugins</Label>
                <Textarea
                  id="enabledPlugins"
                  placeholder="vision-service,automation-service"
                  value={localConfig.plugins.enabled.join(', ')}
                  onChange={(e) => handleConfigChange('plugins.enabled', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of enabled plugin IDs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trustedPaths">Trusted Plugin Paths</Label>
                <Textarea
                  id="trustedPaths"
                  placeholder="/path/to/plugins,/another/trusted/path"
                  value={localConfig.plugins.trustedPaths?.join(', ') || ''}
                  onChange={(e) => handleConfigChange('plugins.trustedPaths', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <p className="text-sm text-muted-foreground">
                  Paths where plugins can be loaded from without additional security checks
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Dashboard Settings</span>
              </CardTitle>
              <CardDescription>
                Customize dashboard appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Dashboard Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={localConfig.dashboard.port}
                    onChange={(e) => handleConfigChange('dashboard.port', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={localConfig.dashboard.theme}
                    onValueChange={(value) => handleConfigChange('dashboard.theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-start Dashboard</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically start dashboard when Atlas launches
                  </p>
                </div>
                <Switch
                  checked={localConfig.dashboard.autoStart}
                  onCheckedChange={(checked) => handleConfigChange('dashboard.autoStart', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}