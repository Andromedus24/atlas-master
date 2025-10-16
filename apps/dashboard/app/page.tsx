'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { Timeline } from '@/components/Timeline';
import { PluginManager } from '@/components/PluginManager';
import { SettingsPanel } from '@/components/SettingsPanel';
import { StatusBar } from '@/components/StatusBar';
import { ConfigManager } from '@free-cluely/config';
import { PluginBus } from '@free-cluely/plugin-bus';
import { AdapterManager } from '@free-cluely/adapters';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<'chat' | 'timeline' | 'plugins' | 'settings'>('chat');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApplication();
  }, []);

  const initializeApplication = async () => {
    try {
      // Initialize core services
      const configManager = ConfigManager.getInstance();
      const pluginBus = PluginBus.getInstance();
      const adapterManager = AdapterManager.getInstance();

      // Check if configuration is complete
      const config = configManager.getConfig();
      if (!configManager.getConfigValue('ai').providers.anthropic?.apiKey &&
          !configManager.getConfigValue('ai').providers.google?.apiKey &&
          !configManager.getConfigValue('ai').providers.ollama?.baseUrl) {
        setError('No AI provider configured. Please check your environment variables.');
        return;
      }

      // Check provider health
      const healthResults = await adapterManager.checkAllProvidersHealth();
      const hasHealthyProvider = Array.from(healthResults.values()).some(healthy => healthy);

      if (!hasHealthyProvider) {
        setError('No AI providers are currently available. Please check your configuration.');
        return;
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize application:', error);
      setError('Failed to initialize the application. Please refresh the page.');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return <ChatInterface />;
      case 'timeline':
        return <Timeline />;
      case 'plugins':
        return <PluginManager />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <ChatInterface />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Initialization Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing Atlas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="glass-effect border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Atlas
              </h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                AI Desktop Assistant
              </span>
            </div>

            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => setActiveView('chat')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'chat'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveView('plugins')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'plugins'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                Plugins
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'settings'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                Settings
              </button>
            </nav>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}