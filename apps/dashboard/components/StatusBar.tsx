'use client';

import { useState, useEffect } from 'react';
import { AdapterManager } from '@free-cluely/adapters';
import { PluginBus } from '@free-cluely/plugin-bus';
import { ConfigManager } from '@free-cluely/config';

export function StatusBar() {
  const [status, setStatus] = useState({
    aiProviders: new Map(),
    plugins: 0,
    memory: { used: 0, total: 0 },
    uptime: 0
  });

  const adapterManager = AdapterManager.getInstance();
  const pluginBus = PluginBus.getInstance();
  const configManager = ConfigManager.getInstance();

  useEffect(() => {
    const updateStatus = async () => {
      try {
        // Get AI provider health
        const providerHealth = await adapterManager.checkAllProvidersHealth();

        // Get plugin count
        const registeredPlugins = pluginBus.getRegisteredPlugins();
        const pluginCount = registeredPlugins.length;

        // Get memory usage (approximate)
        const memoryUsage = process.memoryUsage ? {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        } : { used: 0, total: 0 };

        setStatus({
          aiProviders: providerHealth,
          plugins: pluginCount,
          memory: memoryUsage,
          uptime: Math.floor(process.uptime())
        });
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getProviderStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  const getProviderStatusText = (provider: string, isHealthy: boolean) => {
    return `${provider} ${isHealthy ? '✓' : '✗'}`;
  };

  return (
    <footer className="glass-effect border-t border-white/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 text-sm">
          {/* Left side - System status */}
          <div className="flex items-center space-x-6">
            {/* AI Providers */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">AI:</span>
              <div className="flex space-x-1">
                {Array.from(status.aiProviders.entries()).map(([provider, isHealthy]) => (
                  <div
                    key={provider}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      isHealthy
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}
                    title={getProviderStatusText(provider, isHealthy)}
                  >
                    {provider.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Plugins */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">Plugins:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status.plugins > 0
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {status.plugins}
              </span>
            </div>

            {/* Memory */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">Memory:</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                {status.memory.used}MB / {status.memory.total}MB
              </span>
            </div>
          </div>

          {/* Right side - System info */}
          <div className="flex items-center space-x-6">
            {/* Uptime */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                {formatUptime(status.uptime)}
              </span>
            </div>

            {/* Current provider */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">Provider:</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {adapterManager.getCurrentProvider()}
              </span>
            </div>

            {/* Environment */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">Env:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                process.env.NODE_ENV === 'production'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {process.env.NODE_ENV || 'development'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}