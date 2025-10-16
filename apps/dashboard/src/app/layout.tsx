'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SocketProvider } from '@/components/providers/socket-provider';
import { ConfigProvider } from '@/components/providers/config-provider';
import { PluginProvider } from '@/components/providers/plugin-provider';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ConfigProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                <SocketProvider>
                  <PluginProvider>
                    <div className="min-h-screen bg-background">
                      {children}
                    </div>
                    <Toaster />
                  </PluginProvider>
                </SocketProvider>
              </TooltipProvider>
            </ThemeProvider>
          </ConfigProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}