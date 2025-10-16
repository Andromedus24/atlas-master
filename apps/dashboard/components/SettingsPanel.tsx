'use client';

import { useState, useEffect } from 'react';
import { ConfigManager } from '@free-cluely/config';
import { AdapterManager } from '@free-cluely/adapters';
import { AIProvider, Permission, AppConfig } from '@free-cluely/shared';

export function SettingsPanel() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'permissions' | 'advanced'>('general');

  const configManager = ConfigManager.getInstance();
  const adapterManager = AdapterManager.getInstance();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const currentConfig = configManager.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      configManager.updateConfig(config);
      setMessage({ type: 'success', text: 'Settings saved successfully' });

      // Reload adapters if AI configuration changed
      await adapterManager.reloadConfiguration();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<AppConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const updateAIProvider = (provider: AIProvider, updates: any) => {
    if (!config) return;
    setConfig({
      ...config,
      ai: {
        ...config.ai,
        providers: {
          ...config.ai.providers,
          [provider]: {
            ...config.ai.providers[provider],
            ...updates
          }
        }
      }
    });
  };

  const togglePermission = (permission: Permission) => {
    if (!config) return;
    const currentPermissions = config.permissions.allowed;
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];

    updateConfig({
      permissions: {
        ...config.permissions,
        allowed: newPermissions
      }
    });
  };

  const addDomainToAllowlist = (domain: string) => {
    if (!config || !domain.trim()) return;
    const currentAllowlist = config.permissions.automationAllowlist;
    if (!currentAllowlist.includes(domain.trim())) {
      updateConfig({
        permissions: {
          ...config.permissions,
          automationAllowlist: [...currentAllowlist, domain.trim()]
        }
      });
    }
  };

  const removeDomainFromAllowlist = (domain: string) => {
    if (!config) return;
    updateConfig({
      permissions: {
        ...config.permissions,
        automationAllowlist: config.permissions.automationAllowlist.filter(d => d !== domain)
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p>Failed to load configuration</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'ai', label: 'AI Providers' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure Atlas behavior and preferences
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadConfig}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  General Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.logging.enableConsole}
                        onChange={(e) => updateConfig({
                          logging: { ...config.logging, enableConsole: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable console logging
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.logging.enableFile}
                        onChange={(e) => updateConfig({
                          logging: { ...config.logging, enableFile: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable file logging
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Log Level
                    </label>
                    <select
                      value={config.logging.level}
                      onChange={(e) => updateConfig({
                        logging: { ...config.logging, level: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Providers */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  AI Providers
                </h3>

                <div className="space-y-6">
                  {/* Default Provider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default AI Provider
                    </label>
                    <select
                      value={config.ai.defaultProvider}
                      onChange={(e) => updateConfig({
                        ai: { ...config.ai, defaultProvider: e.target.value as AIProvider }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {adapterManager.getAvailableProviders().map(provider => (
                        <option key={provider} value={provider}>
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Anthropic */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Anthropic (Claude)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={config.ai.providers.anthropic?.apiKey || ''}
                          onChange={(e) => updateAIProvider('anthropic', { apiKey: e.target.value })}
                          placeholder="sk-ant-api03-..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Model
                        </label>
                        <select
                          value={config.ai.providers.anthropic?.model || 'claude-3-sonnet-20240229'}
                          onChange={(e) => updateAIProvider('anthropic', { model: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                          <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Google */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Google (Gemini)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={config.ai.providers.google?.apiKey || ''}
                          onChange={(e) => updateAIProvider('google', { apiKey: e.target.value })}
                          placeholder="AIza..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ollama */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Ollama (Local)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Base URL
                        </label>
                        <input
                          type="url"
                          value={config.ai.providers.ollama?.baseUrl || 'http://localhost:11434'}
                          onChange={(e) => updateAIProvider('ollama', { baseUrl: e.target.value })}
                          placeholder="http://localhost:11434"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Permissions */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Permissions
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.permissions.autoPrompt}
                        onChange={(e) => updateConfig({
                          permissions: { ...config.permissions, autoPrompt: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Auto-prompt for permissions
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Allowed Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['screen', 'clipboard', 'automation', 'network', 'filesystem'] as Permission[]).map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.permissions.allowed.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {permission}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Automation Domain Allowlist
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        placeholder="example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              addDomainToAllowlist(target.value.trim());
                              target.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input?.value.trim()) {
                            addDomainToAllowlist(input.value.trim());
                            input.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.permissions.automationAllowlist.map((domain) => (
                        <span
                          key={domain}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full"
                        >
                          {domain}
                          <button
                            onClick={() => removeDomainFromAllowlist(domain)}
                            className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Advanced Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.security.pluginIsolation}
                        onChange={(e) => updateConfig({
                          security: { ...config.security, pluginIsolation: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable plugin isolation
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Plugin Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={config.security.pluginTimeout}
                      onChange={(e) => updateConfig({
                        security: { ...config.security, pluginTimeout: parseInt(e.target.value) || 30000 }
                      })}
                      min="1000"
                      max="300000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.performance.enableMetrics}
                        onChange={(e) => updateConfig({
                          performance: { ...config.performance, enableMetrics: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable performance metrics
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}