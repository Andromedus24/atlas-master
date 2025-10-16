'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Config } from '@free-cluely/shared';

interface ConfigContextType {
  config: Config | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/config');
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      } else {
        throw new Error('Failed to load configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const value: ConfigContextType = {
    config,
    loading,
    error,
    refreshConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}