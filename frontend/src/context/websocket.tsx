import React, { createContext, useContext, useEffect, useRef } from 'react';

type Callback = (data: any) => void;

interface WebSocketContextType {
  subscribe: (type: string, callback: Callback) => void;
  unsubscribe: (type: string, callback: Callback) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({
  userId,
  children,
}: {
  userId: number;
  children: React.ReactNode;
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const listeners = useRef<Map<string, Set<Callback>>>(new Map());

  useEffect(() => {
    const url = import.meta.env.VITE_API_PREFIX.replace('http://', 'ws://').replace(
      'https://',
      'wss://',
    );
    const socket = new WebSocket(`${url}/ws/${userId}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const [type, payload] = JSON.parse(event.data);
        const callbacks = listeners.current.get(type);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
      } catch (err) {
        console.error('Invalid message', err);
      }
    };

    socket.onclose = () => console.log('WebSocket closed');
    socket.onerror = (err) => console.error('WebSocket error', err);

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [userId]);

  const subscribe = (type: string, callback: Callback) => {
    if (!listeners.current.has(type)) {
      listeners.current.set(type, new Set());
    }
    listeners.current.get(type)!.add(callback);
  };

  const unsubscribe = (type: string, callback: Callback) => {
    listeners.current.get(type)?.delete(callback);
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
