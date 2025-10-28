'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection (in a real app, this would connect to your backend)
    // For now, we'll simulate the connection
    const mockSocket = {
      connected: true,
      on: (event: string, callback: Function) => {
        // Mock event listeners
        console.log(`Listening for ${event}`);
      },
      off: (event: string, callback?: Function) => {
        console.log(`Stopped listening for ${event}`);
      },
      emit: (event: string, data?: any) => {
        console.log(`Emitting ${event}`, data);
      },
      disconnect: () => {
        setIsConnected(false);
      }
    } as any;

    setSocket(mockSocket);
    setIsConnected(true);

    return () => {
      mockSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}