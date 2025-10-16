'use client';

import { useState, useEffect } from 'react';
import { PluginManifest, Permission } from '@free-cluely/shared';
import { PluginBus } from '@free-cluely/plugin-bus';

interface PluginWithStatus extends PluginManifest {
  isRegistered: boolean;
  isLoading: boolean;
  error?: string;
}

export function PluginManager() {
  const [plugins, setPlugins] = useState<PluginWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(null);
  const pluginBus = PluginBus.getInstance();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would scan plugin directories
      // For now, we'll simulate some plugins
      const mockPlugins: PluginWithStatus[] = [
        {
          id: 'vision-service',
          name: 'Vision Service',
          version: '1.0.0',
          description: 'Computer vision and image analysis capabilities',
          author: 'Atlas Team',
          permissions: ['screen'],
          capabilities: ['image-analysis', 'ocr', 'object-detection'],
          entryPoint: './plugins/vision-service/index.js',
          dependencies: { 'opencv': '^4.0.0' },
          isRegistered: false,
          isLoading: false
        },
        {
          id: 'automation-service',
          name: 'Automation Service',
          version: '1.0.0',
          description: 'Browser automation and web scraping',
          author: 'Atlas Team',
          permissions: ['automation', 'network'],
          capabilities: ['web-automation', 'scraping', 'form-filling'],
          entryPoint: './plugins/automation-service/index.js',
          dependencies: { 'puppeteer': '^21.0.0' },
          isRegistered: false,
          isLoading: false
        },
        {
          id: 'data-service',
          name: 'Data Service',
          version: '1.0.0',
          description: 'Data ingestion and processing',
          author: 'Atlas Team',
          permissions: ['network', 'filesystem'],
          capabilities: ['data-ingestion', 'csv-processing', 'api-calls'],
          entryPoint: './plugins/data-service/index.js',
          dependencies: { 'axios': '^1.0.0' },
          isRegistered: false,
          isLoading: false
        }
      ];

      setPlugins(mockPlugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!plugin) return;

    // Update loading state
    setPlugins(prev => prev.map(p =>
      p.id === pluginId ? { ...p, isLoading: true, error: undefined } : p
    ));

    try {
      if (plugin.isRegistered) {
        // Unregister plugin
        await pluginBus.unregisterPlugin(pluginId);
        setPlugins(prev => prev.map(p =>
          p.id === pluginId ? { ...p, isRegistered: false, isLoading: false } : p
        ));
      } else {
        // Register plugin (simulated)
        // In a real implementation, this would load and initialize the plugin
        await new Promise(resolve => setTimeout(resolve, 1000));

        setPlugins(prev => prev.map(p =>
          p.id === pluginId ? { ...p, isRegistered: true, isLoading: false } : p
        ));
      }
    } catch (error) {
      console.error(`Failed to toggle plugin ${pluginId}:`, error);
      setPlugins(prev => prev.map(p =>
        p.id === pluginId ? {
          ...p,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : p
      ));
    }
  };

  const getPermissionColor = (permission: Permission) => {
    switch (permission) {
      case 'screen': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'clipboard': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'automation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'network': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'filesystem': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Plugin list */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Plugin Management
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {plugins.filter(p => p.isRegistered).length} / {plugins.length} active
              </span>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Install Plugin
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading plugins...</p>
            </div>
          ) : plugins.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">🔌</div>
              <p>No plugins found</p>
              <p className="text-sm mt-2">Install plugins to extend Atlas functionality</p>
            </div>
          ) : (
            plugins.map((plugin) => (
              <div key={plugin.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${plugin.isRegistered ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {plugin.name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        v{plugin.version}
                      </span>
                      {plugin.isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {plugin.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Permissions:
                      </span>
                      {plugin.permissions.map((permission) => (
                        <span
                          key={permission}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPermissionColor(permission)}`}
                        >
                          {permission}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Capabilities:
                      </span>
                      {plugin.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 rounded-full"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>

                    {plugin.error && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error:</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{plugin.error}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedPlugin(plugin)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => togglePlugin(plugin.id)}
                      disabled={plugin.isLoading}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        plugin.isRegistered
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {plugin.isLoading ? 'Loading...' : (plugin.isRegistered ? 'Disable' : 'Enable')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Plugin details modal */}
      {selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPlugin.name}
                </h3>
                <button
                  onClick={() => setSelectedPlugin(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedPlugin.description}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version</h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedPlugin.version}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Author</h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedPlugin.author}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entry Point</h4>
                  <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm text-gray-900 dark:text-gray-100">
                    {selectedPlugin.entryPoint}
                  </code>
                </div>

                {selectedPlugin.dependencies && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dependencies</h4>
                    <div className="space-y-1">
                      {Object.entries(selectedPlugin.dependencies).map(([dep, version]) => (
                        <div key={dep} className="flex justify-between">
                          <span className="text-gray-900 dark:text-gray-100">{dep}</span>
                          <span className="text-gray-600 dark:text-gray-400">{version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setSelectedPlugin(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}